# gtd-gdocs

GTD using Google Docs
---------------------

[Get Things Done](http://gettingthingsdone.com/) is a time-management method that significantly boost your efficiency, particularly when you need to handle multiple projects at the same time. 

The idea of GTD is to store all your tasks in some external tools rather than you brain.  Each task is associated with a label that can be either "Actionable", "Waiting For", or "Done". 

If a incoming task can be handled within 2 minutes, it will not be added to the GTD system. Otherwise, if will be push to the "Actionable" queue. Whenever you need to do something, you just pull the first task in the "Actionable" queue, finish it until either it is done, for which case you put it to "Done" queue", or you have to waiting for something, for which case you put it to "Waiting For" queue. 

With GTD, you will be able to focus on what you can do and do it "worry-free". 

With this google app script, you can turn any google doc to a GTD system. It adds the following menus to google docs:

1. **insert task**. There will be a popup asking you the name of the
task. After you click okay button, it will insert a table showing the
information related to this task. Right now, the first cell display the
timestamp you create this task, the second cell is a short description,
the third cell is the status, the last cell is the # of subtasks (the
functionality of subtasks will be implemented later). 
2. **insert comment** You can put any information (context) related to
this task as a comment. The left part of the comment display your user
id and the timestamp you create this comment, and you can write your
comment in the right part.
3. **create task table**. It will create a table with three columns. The first column stores all the "Actionable" tasks, the second column stores all the "Waiting For" tasks, the third column stores all the "Done" tasks. 
4. **move to Actionable**. After you put your cursor in the brief description of a task, or you select the timestamp & brief description, you can click this menu to add the task to the "Actionable" queue. 
5. **move to Waiting For**. Move a task to "Waiting For" queue.
6. **move to Done**. Move a task to "Done" queue.
7. **show task sidebar**. It will show a sidebar that displays all the tasks and their timestamps. If you want to navigate to a task, just search the timestamp (by pressing Ctrl+f). You can hide/unhide tasks by clicking the 'Actionable', 'Waiting For' and 'Done'. If your document body has a table of content, it will also be displayed in the side bar to faciliate navigation.

Another useful trick is that when you document becomes very long, you can press Ctrl+f and then input the timestamp to switch conveniently between the task table and the context of the task. 

For more info about GTD, please read [This awesome book by David Allen](http://www.amazon.com/Getting-Things-Done-Stress-Free-Productivity/dp/0142000280).

Usage
-----

Here is an [example doc](https://docs.google.com/document/d/18dowuhhSB5kajFRbJpmm7efWjU3V4AxYkuWMqhObPeI/edit?usp=sharing), you can copy it to a new document and start to play.

If you want to configure by yourself, here are the steps:

 1. Create a new google document.
 2. Click *Tools->Script Editor...*
 3. Click Blank Project.
 4. Paste the code in *build/compiled_script.js* to the window.
 5. Choose and *onOpen* function and click run in the toolbar.
 6. You can click *GTD->insert date* to insert a timestamp
 7. Add you description of task just after the timestamp (there is no empty line between timestamp and the description. )
 8. Click *GTD->move to Actionable* to mark itas an 'Actionable' task. It will turn red and the task table will be updated, accordingly.
 9. Put all related information of this task after the description (seperate them with description using one empty line). 
 9. Click *GTD->move to Waiting For* to mark as a 'Waiting For' task if you have done what you can do and waiting for something, e.g., you collegues' review. The timestamp and the task description will turn yellow. 
 10. Click *GTD->move to Done* to mark as a 'Done' task if you are done with this task. The timestamp and the task description will turn green.
 11. Click 'GTD->show sideBar* to open a sidebar that diplays all tasks (it will be useful if your log becomes very log.
 12. Enjoy your trip!

Screen Shot
------------
![image](https://cloud.githubusercontent.com/assets/522201/6998601/6fccba50-db9c-11e4-8f6d-ea1a1ef71377.png)



Author Info
-----------
Jing Conan Wang
hbhzwj@gmail.com

License
-------
[GPL v3](http://www.gnu.org/copyleft/gpl.html)
