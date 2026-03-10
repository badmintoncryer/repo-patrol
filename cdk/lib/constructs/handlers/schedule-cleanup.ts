/**
 * Custom Resource Lambda: Clean up all repo-patrol-* EventBridge Schedules.
 * Invoked on stack DELETE to prevent orphaned dynamic schedules.
 */
import {
  SchedulerClient,
  ListSchedulesCommand,
  DeleteScheduleCommand,
} from "@aws-sdk/client-scheduler";

const schedulerClient = new SchedulerClient({});

interface CloudFormationEvent {
  RequestType: "Create" | "Update" | "Delete";
  ResourceProperties: Record<string, string>;
}

export const handler = async (event: CloudFormationEvent) => {
  console.log("Schedule cleanup event:", event.RequestType);

  // Only act on DELETE
  if (event.RequestType !== "Delete") {
    return { Status: "SUCCESS" };
  }

  console.log("Stack deletion detected — cleaning up repo-patrol-* schedules");

  let nextToken: string | undefined;

  do {
    const listResult = await schedulerClient.send(
      new ListSchedulesCommand({
        NamePrefix: "repo-patrol-",
        MaxResults: 100,
        NextToken: nextToken,
      })
    );

    for (const schedule of listResult.Schedules || []) {
      if (!schedule.Name) continue;
      try {
        await schedulerClient.send(
          new DeleteScheduleCommand({ Name: schedule.Name })
        );
        console.log(`Deleted schedule: ${schedule.Name}`);
      } catch (e: any) {
        if (e.name !== "ResourceNotFoundException") {
          console.error(`Failed to delete schedule ${schedule.Name}:`, e);
        }
      }
    }

    nextToken = listResult.NextToken;
  } while (nextToken);

  console.log("Schedule cleanup complete");
  return { Status: "SUCCESS" };
};
