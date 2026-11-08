from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Doc(BaseModel):
    model_config = ConfigDict(extra="forbid")


class User(Doc):
    name: str
    avatar: str = ""
    preferences: dict = {}
    tags: list[str] = []
    completionRate: float = Field(0, ge=0, le=1)
    lastLogin: datetime | None = None


class Event(Doc):
    title: str
    description: str = ""
    startTime: datetime
    endTime: datetime
    type: str = "onetime"
    color: str = ""

    @model_validator(mode="after")
    def check_times(self):
        if self.endTime <= self.startTime:
            raise ValueError("endTime must be after startTime")
        return self


class Task(Doc):
    title: str
    description: str = ""
    status: str = "pending"
    priority: str = "medium"
    dueDate: datetime | None = None
    subTasks: list = []


class Progress(Doc):
    taskId: str
    date: datetime
    hoursWorked: int = Field(0, ge=0)
    workDone: str = ""
    nextSteps: str = ""
    completed: bool = False


class Assignment(Doc):
    taskId: str
    eventDate: datetime
    assignedTo: str
    hoursRequired: int = Field(0, ge=0)
    status: str = "pending"
    eventRef: str = ""
