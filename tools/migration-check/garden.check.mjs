// Garden checks (supabase/migrations/*_garden.sql). Called from check.mjs after the account-deletion checks, so users 1
// and 2 are the ones still around. Exercises the RPCs the way the app does and tries the obvious ways to cheat.
export async function runGarden({ db, u, check, as, throws }) {
  const gstate = async (user) => (await db.query(`select coins, boxes, pity, boxes_opened from public.garden_state where user_id='${u(user)}'`)).rows[0]
  const inv = async (user) => Object.fromEntries((await db.query(`select species, qty from public.garden_inventory where user_id='${u(user)}'`)).rows.map((r) => [r.species, r.qty]))
  const gtoday = (await db.query(`select private.garden_today('${u(1)}')::text d`)).rows[0].d
  const night = async (offset) => (await db.query(`select (date '${gtoday}' + ${offset})::text d`)).rows[0].d
  let ok, msg, r, st

  ;[ok, msg] = await throws(1, `select public.garden_claim_nights('[]'::jsonb)`, [], /Garden not started/)
  check('garden: nothing works before init', ok, msg)
  check('garden: init creates the garden', (await as(1, () => db.query(`select public.garden_init() created`))).rows[0].created === true)
  let inv1 = await inv(1)
  check('garden: starter seeds', inv1.sprout === 2 && inv1.tulip === 1 && inv1.chamomile === 1, JSON.stringify(inv1))
  check('garden: init is idempotent', (await as(1, () => db.query(`select public.garden_init() created`))).rows[0].created === false && (await inv(1)).sprout === 2)
  await as(2, () => db.query(`select public.garden_init()`))

  // ---- nights -> coins: once per night, only nights that exist, only inside the window ----
  const d0 = gtoday
  for (const off of [-1, 0]) {
    await db.query(`insert into public.sleep_nights (user_id, night_date, source, duration_min) values ($1, $2::date, 'apple_health', 450) on conflict do nothing`, [u(1), await night(off)])
  }
  const dm1 = await night(-1), dm2 = await night(-2), dm30 = await night(-30), dfut = await night(3)
  r = (await as(1, () => db.query(`select public.garden_claim_nights($1::jsonb) r`, [JSON.stringify([
    { date: dm1, score: 83 }, { date: d0, score: 100 }, { date: dm30, score: 90 }, { date: dfut, score: 90 }, { date: '2020-01-01', score: 90 },
  ])]))).rows[0].r
  check('garden: claims real nights inside the window only', r.coins === 183 && r.boxes === 1 && r.dates.length === 2, JSON.stringify(r))
  r = (await as(1, () => db.query(`select public.garden_claim_nights($1::jsonb) r`, [JSON.stringify([{ date: dm1, score: 83 }, { date: d0, score: 100 }])]))).rows[0].r
  check('garden: claiming the same nights again pays nothing', r.coins === 0 && r.boxes === 0, JSON.stringify(r))
  st = await gstate(1)
  check('garden: balance after claims', st.coins === 183 && st.boxes === 1, JSON.stringify(st))
  r = (await as(1, () => db.query(`select public.garden_claim_nights($1::jsonb) r`, [JSON.stringify([{ date: dm2, score: 999 }])]))).rows[0].r
  check('garden: no claim for a night that does not exist', r.coins === 0, JSON.stringify(r))
  await db.query(`insert into public.sleep_nights (user_id, night_date, source, duration_min) values ($1, $2::date, 'apple_health', 450)`, [u(1), dm2])
  r = (await as(1, () => db.query(`select public.garden_claim_nights($1::jsonb) r`, [JSON.stringify([{ date: dm2, score: 999 }])]))).rows[0].r
  check('garden: scores are clamped to 100', r.coins === 100 && r.boxes === 1, JSON.stringify(r))
  ;[ok, msg] = await throws(1, `select public.garden_claim_nights('{"a":1}'::jsonb)`, [], /Expected a list/)
  check('garden: claim payload must be a list', ok, msg)
  ;[ok, msg] = await throws(1, `update public.garden_state set coins = 99999 where user_id = $1`, [u(1)], /permission denied/)
  check('garden: no direct writes to state', ok, msg)
  ;[ok, msg] = await throws(1, `insert into public.garden_inventory (user_id, species, qty) values ($1, 'willow', 5)`, [u(1)], /permission denied/)
  check('garden: no direct writes to inventory', ok, msg)
  ;[ok, msg] = await throws(1, `insert into public.garden_plants (user_id, species, planted_on) values ($1, 'willow', now())`, [u(1)], /permission denied/)
  check('garden: no direct writes to plants', ok, msg)
  check('garden: another user\'s balance is untouched', (await gstate(2)).coins === 0)

  // ---- achievements ----
  r = (await as(1, () => db.query(`select public.garden_claim_achievements(array['first-night','first-night','nope','full-60']) r`))).rows[0].r
  check('garden: achievements pay once, unknown ids ignored', r.coins === 1550 && r.boxes === 2 && r.claimed.length === 2 && [...r.seeds].join() === 'willow', JSON.stringify(r))
  r = (await as(1, () => db.query(`select public.garden_claim_achievements(array['first-night','full-60']) r`))).rows[0].r
  check('garden: re-claiming pays nothing', r.coins === 0 && r.claimed.length === 0, JSON.stringify(r))
  inv1 = await inv(1)
  check('garden: the goal-only plant arrives as a seed', inv1.willow === 1, JSON.stringify(inv1))

  // ---- shop and buying ----
  const shop = (await as(1, () => db.query(`select public.garden_shop() s`))).rows[0].s
  const always = shop.items.filter((i) => !i.rotating).map((i) => i.species).sort().join()
  check('garden: shop = the always species + 3 rotating, box 500', always === 'bamboo,bonsai,chamomile,clover,dandelion,fern,lavender,pine,sprout,succulent,tulip' && shop.items.filter((i) => i.rotating).length === 3 && shop.box_price === 500, JSON.stringify(shop))
  check('garden: everyone sees the same stock', JSON.stringify((await as(2, () => db.query(`select public.garden_shop() s`))).rows[0].s) === JSON.stringify(shop))
  ;[ok, msg] = await throws(1, `select public.garden_buy('willow', 1)`, [], /not in the shop/)
  check('garden: unsold species cannot be bought', ok, msg)
  ;[ok, msg] = await throws(2, `select public.garden_buy('sprout', 1)`, [], /Not enough coins/)
  check('garden: cannot overspend', ok, msg)
  ;[ok, msg] = await throws(1, `select public.garden_buy('sprout', 0)`, [], /between 1 and 20/)
  check('garden: quantity is validated', ok, msg)
  st = await gstate(1)
  const sproutPrice = shop.items.find((i) => i.species === 'sprout').price
  check('garden: prices differ between plants', new Set(shop.items.map((i) => i.price)).size === shop.items.length, JSON.stringify(shop.items.map((i) => i.price)))
  let bal = (await as(1, () => db.query(`select public.garden_buy('sprout', 2) b`))).rows[0].b
  check('garden: buying deducts coins and adds seeds', bal === st.coins - 2 * sproutPrice && (await inv(1)).sprout === 4, `${bal} ${JSON.stringify(await inv(1))}`)
  bal = (await as(1, () => db.query(`select public.garden_buy('box', 1) b`))).rows[0].b
  check('garden: boxes cost 500', bal === st.coins - 2 * sproutPrice - 500 && (await gstate(1)).boxes === (st.boxes + 1), JSON.stringify(await gstate(1)))

  // ---- boxes: odds look right and pity guarantees a rare ----
  await db.exec(`update public.garden_state set boxes = 400, pity = 0 where user_id = '${u(2)}'`)
  const rarityOf = Object.fromEntries((await db.query(`select id, rarity from public.garden_species`)).rows.map((x) => [x.id, x.rarity]))
  const counts = {}
  let dry = 0, maxDry = 0
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${u(2)}', false)`)
  for (let i = 0; i < 400; i++) {
    const sp = (await db.query(`select public.garden_open_box() s`)).rows[0].s
    const rar = rarityOf[sp]
    counts[rar] = (counts[rar] ?? 0) + 1
    if (rar === 'rare' || rar === 'epic') dry = 0; else dry++
    maxDry = Math.max(maxDry, dry)
  }
  await db.exec('reset role')
  check('garden: 400 boxes consumed and counted', (await gstate(2)).boxes === 0 && (await gstate(2)).boxes_opened === 400)
  check('garden: drop rates are near 50/30/17/3 and legendary never drops', counts.common > 140 && counts.common < 250 && counts.uncommon > 85 && counts.uncommon < 160 && counts.rare > 35 && counts.epic > 3 && !counts.legendary, JSON.stringify(counts))
  check('garden: pity never lets 7 boxes pass without rare+', maxDry <= 6, String(maxDry))
  check('garden: sakura (evolution only) never drops', !(await inv(2)).sakura)
  ;[ok, msg] = await throws(2, `select public.garden_open_box()`, [], /No Dream Boxes/)
  check('garden: cannot open a box you do not have', ok, msg)

  // ---- planting, moving, swapping, storing ----
  await db.exec(`delete from public.garden_inventory where user_id='${u(1)}'; select private.garden_add_seed('${u(1)}', 'sprout', 2); select private.garden_add_seed('${u(1)}', 'tulip', 1)`)
  const plantId = (await as(1, () => db.query(`select public.garden_plant('sprout', 12) id`))).rows[0].id
  check('garden: planting uses a seed', (await inv(1)).sprout === 1)
  ;[ok, msg] = await throws(1, `select public.garden_plant('sprout', 12)`, [], /cell is taken/)
  check('garden: cannot plant on an occupied cell', ok, msg)
  ;[ok, msg] = await throws(1, `select public.garden_plant('sprout', 25)`, [], /outside the garden/)
  check('garden: cell range enforced', ok, msg)
  ;[ok, msg] = await throws(1, `select public.garden_plant('willow', 3)`, [], /no willow seeds/)
  check('garden: cannot plant a seed you do not own', ok, msg)
  const plant2 = (await as(1, () => db.query(`select public.garden_plant('tulip', 0) id`))).rows[0].id
  const cells = async () => Object.fromEntries((await db.query(`select id, cell from public.garden_plants where user_id='${u(1)}'`)).rows.map((x) => [x.id, x.cell]))
  await as(1, () => db.query(`select public.garden_move($1, 3)`, [plantId]))
  let cl = await cells()
  check('garden: move to an empty cell', cl[plantId] === 3 && cl[plant2] === 0, JSON.stringify(cl))
  await as(1, () => db.query(`select public.garden_move($1, 0)`, [plantId]))
  cl = await cells()
  check('garden: moving onto a plant swaps them', cl[plantId] === 0 && cl[plant2] === 3, JSON.stringify(cl))
  await as(1, () => db.query(`select public.garden_move($1, null)`, [plantId]))
  cl = await cells()
  check('garden: picking up stores the plant', cl[plantId] === null && cl[plant2] === 3, JSON.stringify(cl))
  await as(1, () => db.query(`select public.garden_move($1, 3)`, [plantId]))
  cl = await cells()
  check('garden: placing a stored plant onto an occupied cell swaps the other into storage', cl[plantId] === 3 && cl[plant2] === null, JSON.stringify(cl))
  ;[ok, msg] = await throws(2, `select public.garden_move($1, 5)`, [plantId], /Plant not found/)
  check('garden: cannot move someone else\'s plant', ok, msg)

  check('garden: groupmate sees planted plants only', (await as(2, () => db.query(`select id from public.garden_plants where user_id = $1`, [u(1)]))).rows.length === 1)
  check('garden: owner sees planted and stored plants', (await as(1, () => db.query(`select id from public.garden_plants`))).rows.length === 2)

  // ---- evolution ----
  ;[ok, msg] = await throws(1, `select public.garden_evolve($1)`, [plantId], /at least one night/)
  check('garden: cannot evolve on the day it was planted', ok, msg)
  await db.exec(`update public.garden_plants set planted_on = planted_on - 5 where user_id='${u(1)}'`)
  await db.exec(`select private.garden_add_seed('${u(1)}', 'reed', 1)`)
  const reedId = (await as(1, () => db.query(`select public.garden_plant('reed', 9) id`))).rows[0].id
  await db.exec(`update public.garden_plants set planted_on = planted_on - 5 where id = '${reedId}'`)
  ;[ok, msg] = await throws(1, `select public.garden_evolve($1)`, [reedId], /does not evolve/)
  check('garden: reeds do not evolve', ok, msg)
  const evo = (await as(1, () => db.query(`select public.garden_evolve($1) s`, [plantId]))).rows[0].s
  const ev = (await db.query(`select species, evolved_from, evolved_on::text eo from public.garden_plants where id = $1`, [plantId])).rows[0]
  check('garden: sprout evolves into a sapling', evo === 'sapling' && ev.species === 'sapling' && ev.evolved_from === 'sprout' && ev.eo === gtoday, JSON.stringify(ev))
  ;[ok, msg] = await throws(1, `select public.garden_evolve($1)`, [plantId], /at least one night/)
  check('garden: an evolved plant waits a night before evolving again', ok, msg)

  // ---- catalog and anon ----
  check('garden: catalog is readable', (await as(1, () => db.query(`select count(*)::int n from public.garden_species`))).rows[0].n === 42)
  await db.exec('set role anon')
  try { await db.query(`select public.garden_init()`); check('garden: anon cannot call init', false, 'did not throw') } catch (e) { check('garden: anon cannot call init', /permission denied/.test(e.message), e.message) }
  try { await db.query(`select * from public.garden_state`); check('garden: anon cannot read state', false, 'did not throw') } catch (e) { check('garden: anon cannot read state', /permission denied/.test(e.message), e.message) }
  await db.exec('reset role')
}
