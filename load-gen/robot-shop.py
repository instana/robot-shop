from locust import HttpLocust, TaskSet, task

class UserBehavior(TaskSet):
    def on_start(self):
        """ on_start is called when a Locust start before any task is scheduled """
        print('Starting')

    @task
    def index(self):
        self.client.get("/")

    @task
    def user(self):
        res = self.client.get("/api/user/uniqueid")
        print('User {}'.format(res.content))

class WebsiteUser(HttpLocust):
    task_set = UserBehavior
    min_wait = 1000
    max_wait = 5000
