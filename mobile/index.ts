// Custom entry so the HealthKit background-delivery handler is registered before the app renders. iOS can launch the app
// in the background when new sleep data arrives, and the handler has to exist by then (the UI never mounts).
import './src/background'
import 'expo-router/entry'
