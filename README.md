# Great Task Document
This project turns google docs to a full-fledge task management system.

With this google app script, you can turn any google doc to a GTD
system. If the current document is a normal document, it will add an
**Initialize** option to the menu.
If you click this option, it will change the background and margin of
the page, and create a table with four columns. The first column stores
all the "Actionable" tasks, the second column stores all the "Waiting
For" tasks, the third column stores all the "Done" tasks, and the fourth
columns stores the "Someday" tasks that have low priority.

If the document has been initialized before, it will add the following
options to the menu bar:

1. **Insert task**. You need to put your cursor in the line whose text
   should be the text description. After that, you could create task by
   clicking this menu. By default, a new task is "Actionable".
2. **Insert update**. You can put any information (update) related to a
   task. The upper part of the update display your user id and the
   timestamp you create this update, and you can write your update in
   the lower part.
3. **Mark task as**. You can change task status to be 'Actionable',
   'Waiting For', 'Done' or 'Someday'.
4. **Insert task separator**. This is to insert a separator so that
   different tasks can be separated more visually. Of course, you don't
   have to insert separator between two tasks.

Another useful trick is that when you document becomes very long, you
can press Ctrl+f and then input the timestamp to switch conveniently
between the task table and the context of the task.

##Get Things Done
The tool is motivated by [Get Things Done](http://gettingthingsdone.com/),
which is a task-management method that help you improve your efficiency,
particularly when you need to handle multiple projects at the same time.

The idea of GTD is to store all your tasks in some external tools rather than you brain.
Each task is associated with a label that can be either "Actionable", "Waiting For", or
"Done". If a incoming task can be handled within 2 minutes, it will not be added to the
GTD system. Otherwise, if will be push to the "Actionable" queue. Whenever you need to
do something, you just pull the first task in the "Actionable" queue, finish it until
either it is done, for which case you put it to "Done" queue", or you have to waiting
for something, for which case you put it to "Waiting For" queue. You can also mark tasks
as "Someday" if you don't have bandwidth and the task is low-priority. Later when you have
time, you can move it back to "Actionable".

The following figure illustrated the process

![GTD state diagram](https://cloud.githubusercontent.com/assets/522201/16716781/604968cc-46bb-11e6-9965-07061906f1a3.png)

With GTD, you will be able to focus on what you can do and do it "worry-free".

For more info about GTD, please read [This awesome book by David Allen](http://www.amazon.com/Getting-Things-Done-Stress-Free-Productivity/dp/0142000280).

#Usage

Please click [this link](https://docs.google.com/document/d/18dowuhhSB5kajFRbJpmm7efWjU3V4AxYkuWMqhObPeI/copy), which will make a copy of the template document.

 1. Put your cursor to the text you want to create as a tas, and then click *GTD->create task* to create a task. The beginning of the description will be change to a emoji that represents the status of the task. The status of a new task will be 'Actionable' and the emoji is '🅰️'. The task will also be displayed in the summary table in the beginning part of the document.
 1. You can click *GTD->Insert update* to insert some context information related to this task.
 1. Put your cursor in the line of a task (which should have a status emoji at the beginning), and click *GTD->Mark task as Waiting For* to mark the task as a 'Waiting For' task if you have done what you can do and waiting for something, e.g., you colleagues' review. The status emoji should change to '🆆'.
 1. Click *GTD->Mark task as Done* to mark as a 'Done' task if you are done with this task. The status emoji should change to '✅'.
 1. You can also click *GTD->Mark task as Actionable* to mark it as an 'Actionable' task again and the status emoji will change to '🅰️'.
 1. Enjoy your trip!


#Screenshot

![image](https://github.com/hbhzwj/gtd-gdocs/blob/master/resources/GTD-screenshot-1.png)
![image](https://github.com/hbhzwj/gtd-gdocs/blob/master/resources/GTD-screenshot-2.png)
![image](https://github.com/hbhzwj/gtd-gdocs/blob/master/resources/GTD-screenshot-3.png)



#Author Info

Jing Conan Wang
jingconanwang@gmail.com

#License

[GPL v3](http://www.gnu.org/copyleft/gpl.html)
