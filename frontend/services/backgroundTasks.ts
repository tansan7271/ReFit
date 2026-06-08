import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

import { syncDailyMetrics, syncSleepData } from '@/services/health';

export const HEALTH_SYNC_TASK = 'refit-health-sync';

// TaskManager.defineTask은 모듈 최상위에서 호출해야 한다.
// 앱 번들 로드 시점에 등록되어야 백그라운드에서 실행 가능.
TaskManager.defineTask(HEALTH_SYNC_TASK, async () => {
  try {
    await Promise.all([syncSleepData(), syncDailyMetrics()]);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerHealthSyncTask(): Promise<void> {
  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status !== BackgroundFetch.BackgroundFetchStatus.Available) return;

    const isRegistered = await TaskManager.isTaskRegisteredAsync(HEALTH_SYNC_TASK);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(HEALTH_SYNC_TASK, {
      minimumInterval: 15 * 60, // 15분
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (e) {
    console.error('[BackgroundFetch] 등록 실패', e);
  }
}
