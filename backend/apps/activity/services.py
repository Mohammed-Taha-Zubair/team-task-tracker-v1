from apps.activity.models import Activity

# Helper service to record an activity log in MongoDB
def log_activity(team, user, message, task=None):
    activity = Activity(
        team=team,
        user=user,
        message=message,
        task=task,
    )
    activity.save()
    return activity
