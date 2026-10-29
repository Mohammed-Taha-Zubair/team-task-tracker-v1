from apps.activity.models import Activity

# Helper service to record an activity log in MongoDB
def log_activity(team, user, message, task=None, action_type="activity"):
    activity = Activity(
        team=team,
        user=user,
        message=message,
        task=task,
        action_type=action_type,
    )
    activity.save()
    return activity
