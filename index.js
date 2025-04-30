/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import { setupReminderSystem } from './src/utils/reminderUtils';

// Initialize the reminder system
setupReminderSystem();

AppRegistry.registerComponent(appName, () => App);
