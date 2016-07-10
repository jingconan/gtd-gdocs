# Google Task Document
This project turns google docs to a full-fledge task management system. 

With this google app script, you can turn any google doc to a GTD
system. If the current document is a normal document, it will add an
**Initialize** option to the menu.
If you click this option, it will change the background and margin of
the page, and create a table with four columns. The first column stores
all the "Actionable" tasks, the second column stores all the "Waiting
For" tasks, the third column stores all the "Done" tasks, and the fourth
columns stores the "Someday" tasks that have low priority.

If the documenet has been initialized before, it will add the following
options to menus:

1. **Insert task**. There will be a popup asking you the name of the
task. After you click okay button, it will insert a table showing the
information related to this task. By default, a new task is "Actionable".
2. **Insert comment**. You can put any information (context) related to
this task as a comment. The upper part of the comment display your user
id and the timestamp you create this comment, and you can write your
comment in the lower part.
3. **Insert task separator**. This is to insert a separtor so that
different tasks can be separated more visually. Of course, you don't
have to insert separator between two tasks.
4. **Jump to task thread**. Each task corresponds to a sequence of
comment after a task thread header. If you put cursor in a task in the
summary table and the click this menu, the cursor will jump to the
corresponding task thread. 
3. **Mark task as**. You can change task status to be 'Actionable',
'Waiting For', 'Done' or 'Someday'

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

Here is an [example doc](https://docs.google.com/document/d/18dowuhhSB5kajFRbJpmm7efWjU3V4AxYkuWMqhObPeI/edit?usp=sharing), you can copy it to a new document and start to play.

If you want to configure by yourself, here are the steps:

 1. Create a new google document.
 2. Click *Tools->Script Editor...*
 3. Click Blank Project.
 4. Paste the code in *build/compiled_script.js* to the window.
 5. Choose and *onOpen* function and click run in the toolbar.
 6. You can click *GTD->Insert task* to insert a task.
 7. Type a short description of the task in the popup dialog. After clicking "okay", a table with the task description will be inserted under your cursor. By default the text in the table is red, and it is "Actionable". The task will also be displayed in the summary table in the beginning part of the document.
 8. You can click *GTD->Insert comment* to insert some context information related to this task. 
 9. Put your cursor in the table with short description of a task, and click *GTD->move to Waiting For* to mark as a 'Waiting For' task if you have done what you can do and waiting for something, e.g., you colleagues' review. The timestamp and the task description will turn yellow. 
 10. Click *GTD->Mark task as->Done* to mark as a 'Done' task if you are done with this task. The timestamp and the task description will turn green.
 11. You can also click *GTD->Mark task as->Actionable* to mark it as an 'Actionable' task again. 
 12. Enjoy your trip!

# Sync to Google Tasks


Each task document is usually for one project.  If you enable google
task api, the tasks are also automatically updated to google tasks. The
advantage is that you will have an unified interface that display all
the tasks among multiple projects.

In order to enable task functinon, you need to 
 1. Open https://mail.google.com/tasks/ig, create a list with name *GTD
 Lists*.
 2. Create a document, open *Tools->Script Editor*, paste the
 compiled_script.js in to the script editor. In the script editor, click
 *Resources->Advanced Google Services*
 3. In the popup window, choose v1 for Tasks API and click the button so
 that the status is *on*, which indicates that the API will be allowed.
 4. In the script editor, select *OnOpen* and click run
 5. In the document, click "Initialize", you will see that it asks two
 more pemissions. 1. View your tasks and 2. Manage your tasks.
 6. After click *Insert task*, you may get the following error message
 *Access Not Configured. Tasks API has not been used in project
 <ID> before or it is disabled. Enable it by visiting <SOME_URL>
 then retry. If you enabled this API recently, wait a few minutes for
 the action to propagate to our systems and retry.*
 7. Open the url in the error message in a new tab and click *Enable*
 button.
 8. Go back to the document and now you are ready to create and change
 status of tasks.
 9. Check the summary of your tasks in https://mail.google.com/tasks/ig.
 I recommend you to install this chrome addon: [ExtensionImprovements
 for Google
 Tasks](https://chrome.google.com/webstore/detail/improvements-for-google-t/mhikceoaalnjmimabofghliacpmljocb?hl=en-US).
 With this addon, tasks with different status will be displayed in
 different colors.

#Screen Shot

![image](https://github.com/hbhzwj/gtd-gdocs/blob/master/resources/screenshot.png)



#Author Info

Jing Conan Wang
hbhzwj@gmail.com

#License

[GPL v3](http://www.gnu.org/copyleft/gpl.html)
