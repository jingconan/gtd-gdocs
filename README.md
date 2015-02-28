# gtd-gdocs

GTD using Google Docs
---------------------

[Get Things Done](http://gettingthingsdone.com/) is a time-management method that significantly boost your efficiency, particularly when you need to handle multiple projects at the same time. 

The idea of GTD is to store all your tasks in some external tools rather than you brain.  Each task is associated with a label that can be either "Actionable", "Waiting For", or "Done". 

If a incoming task can be handled within 2 minutes, it will not be added to the GTD system. Otherwise, if will be push to the "Actionable" queue. Whenever you need to do something, you just pull the first task in the "Actionable" queue, finish it until either it is done, for which case you put it to "Done" queue", or you have to waiting for something, for which case you put it to "Waiting For" queue. 

With GTD, you will be able to focus on what you can do and do it "worry-free". 

With this google app script, you can turn any google doc to a GTD system. It adds the following menus to google docs:

1. **insert date**. it can insert an ISO format date after the current cursor. Every small task begins with a date, which is also used as an unique identifier of the task. The first line after the date is a brief description of the task. After that you can put any information (context) related to this task. There should be a empty line between the brief description and the context.
2. **create task table**. It will create a table with three columns. The first column stores all the "Actionable" tasks, the second column stores all the "Waiting For" tasks, the third column stores all the "Done" tasks. 
3. **move to Actionable**. After you put your cursor in the brief description of a task, or you select the timestamp & brief description, you can click this menu to add the task to the "Actionable" queue. 
4. **move to Waiting For**. Move a task to "Waiting For" queue.
5. **move to Done**. Move a task to "Done" queue. 

Another useful trick is that when you document becomes very long, you can press Ctrl+f and then input the timestamp to switch conveniently between the task table and the context of the task. 

For more info about GTD, please read [This awesome book by David Allen](http://www.amazon.com/Getting-Things-Done-Stress-Free-Productivity/dp/0142000280).

Usage
-----

 1. Create a new google document.
 2. Click *Tools->Script Editor...*
 3. Click Blank Project.
 4. Paste the code in script.js to the window.
 5. Choose and *onOpen* function and click run in the toolbar.
 6. Enjoy your trip!



Author Info
-----------
Jing Conan Wang
hbhzwj@gmail.com

License
-------
[GPL v3](http://www.gnu.org/copyleft/gpl.html)
