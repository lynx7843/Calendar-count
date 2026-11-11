from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Doc(BaseModel):
    model_config = ConfigDict(extra="forbid")


Weekday = Annotated[int, Field(ge=0, le=6)]  # 0 = Monday
DateKey = Annotated[str, Field(pattern=r"^\d{4}-\d{2}-\d{2}$")]

# Size caps keep docs far below Firestore's 1 MiB limit.
Short = Annotated[str, Field(max_length=200)]
Long = Annotated[str, Field(max_length=5000)]
Tag = Annotated[str, Field(max_length=50)]
Tags = Annotated[list[Tag], Field(max_length=20)]
Hours = Annotated[int, Field(ge=0, le=24)]


class User(Doc):
    name: Short
    avatar: Annotated[str, Field(max_length=2000)] = ""  # URL
    preferences: Annotated[dict[Tag, Short | int | float | bool | None], Field(max_length=20)] = {}
    tags: Tags = []
    completionRate: float = Field(0, ge=0, le=1)
    lastLogin: datetime | None = None


class Event(Doc):
    title: Short
    description: Long = ""
    startTime: datetime
    endTime: datetime
    type: Short = "onetime"
    color: Annotated[str, Field(max_length=20)] = ""
    tags: Tags = []
    completed: bool = False
    # Routine repeat rule; weekdays only apply to weekly.
    frequency: Literal["daily", "weekly", "monthly"] = "daily"
    weekdays: Annotated[list[Weekday], Field(max_length=7)] = []
    # shortcut: ~10 years of daily completions, archive old dates if a routine outlives it
    completedDates: Annotated[list[DateKey], Field(max_length=4000)] = []  # done routine days, local YYYY-MM-DD

    @model_validator(mode="after")
    def check_times(self):
        if self.endTime <= self.startTime:
            raise ValueError("endTime must be after startTime")
        return self


class SubTask(Doc):
    title: Short
    done: bool = False


class Task(Doc):
    title: Short
    description: Long = ""
    status: Short = "pending"
    priority: Short = "medium"
    dueDate: datetime | None = None
    subTasks: Annotated[list[SubTask], Field(max_length=100)] = []


class Progress(Doc):
    taskId: Short
    date: datetime
    hoursWorked: Hours = 0
    workDone: Long = ""
    nextSteps: Long = ""
    completed: bool = False


class Assignment(Doc):
    taskId: Short
    eventDate: datetime
    assignedTo: Short = ""
    part: Short = ""  # subtask title this slot works on
    hoursRequired: Hours = 0
    status: Short = "pending"
    eventRef: Short = ""
