from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Doc(BaseModel):
    model_config = ConfigDict(extra="forbid")


Weekday = Annotated[int, Field(ge=0, le=6)]  # 0 = Monday
DateKey = Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$")]


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
    tags: list[str] = []
    completed: bool = False
    # Routine repeat rule; weekdays only apply to weekly.
    frequency: Literal["daily", "weekly", "monthly"] = "daily"
    weekdays: list[Weekday] = []
    completedDates: list[DateKey] = []  # done routine days, local YYYY-MM-DD

    @model_validator(mode="after")
    def check_times(self):
        if self.endTime <= self.startTime:
            raise ValueError("endTime must be after startTime")
        return self


class SubTask(Doc):
    title: str
    done: bool = False


class Task(Doc):
    title: str
    description: str = ""
    status: str = "pending"
    priority: str = "medium"
    dueDate: datetime | None = None
    subTasks: list[SubTask] = []


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
    assignedTo: str = ""
    part: str = ""  # subtask title this slot works on
    hoursRequired: int = Field(0, ge=0)
    status: str = "pending"
    eventRef: str = ""
