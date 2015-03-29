// This is a google app scripts that implements a GTD work flow using
// Google Docs. 
//
// Author: Jing Conan Wang 
// Email: hbhzwj@gmail.com
//
// This code is under GPL license. 
function assert(condition, message) {
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message; // Fallback
    }
}

function debug(s) {
  DocumentApp.getActiveDocument().getBody().appendParagraph(s);
}

Date.prototype.toISO = function (key) {
  function f(n) {
    // Format integers to have at least two digits.
    return n < 10 ? '0' + n : n;
  }
  return '[' + this.getFullYear()   + '-' +
       f(this.getMonth() + 1) + '-' +
       f(this.getDate())      + ' ' +
       f(this.getHours())     + ':' +
       f(this.getMinutes())   + ':' +
       f(this.getSeconds())   + '' + 
       ']';
};

if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) == 0;
  };
}



function insertDate() {
  var doc = DocumentApp.getActiveDocument();
  var cursor = doc.getCursor();
  var text = '\n' + new Date().toISO() + '\n';
  var element = cursor.insertText(text);
  doc.setCursor(doc.newPosition(element, text.length));
}
  

var app = {
  initTaskTable: function() {
   var tables = this.body.getTables();
   var taskTable;
   if (tables.length == 0 || !this._isTaskTable(tables[0])) {
     taskTable = this._createDefaultGTDTable(this.body);
   } else {
     taskTable = tables[0];
   }
   this.taskTable = taskTable;
  },
  
  getTaskTable: function() {
    return this.taskTable;
  },
  
  getAllTasksFromCol: function(col) {
    var i, cell, rowNum = this.taskTable.getNumRows(), res = [];
      for (i = 1; i < rowNum; ++i) {
        cell = this.taskTable.getCell(i, col);
        if (typeof cell !== 'undefined' && cell.getText() !== '') {
          res.push(cell.getText());
        }
    }
    return res;
  },
  
  getSideBarTableContent: function() {
    var i, j, tasks, thisTasks;
    var res = {
        task_queues: [],
    };
    for (i = 0; i < this.header.length; ++i) {
        tasks = this.getAllTasksFromCol(i);
        thisTasks = [];
        for (j = 0; j < tasks.length; ++j) {
            thisTasks.push({name: tasks[j]});
        }
        res.task_queues.push({
            index: (i + 1).toString(),
            type: this.header[i],
            color: this.headerColor[i],
            tasks: thisTasks
        });
    }
    return res;
  },
  
  getColIdx: function(name) {
    var i;
    if (typeof this.colIdx === 'undefined') {
      this.colIdx = {};
      for (i = 0; i < this.header.length; ++i) {
        this.colIdx[this.header[i]] = i;
      }
    }
    return this.colIdx[name];
  },
  
  getID: function(s) {
    // Use timestamp as id if there is timestamp
    var res = s.split(']')[0].split('[')[1];
    //debug('string: ' + s + ' id: ' + res);

    if (typeof res === 'undefined') {
      return s;
    }
  },
  
  // this function returns the first empty cell in a column. 
  findFirstEmptyCell: function(col) {
    return this.findFirstCell(col, '', false);
  },
  
  findFirstCell: function(col, target, useID) {
    if (typeof col === 'string') {
      col = this.getColIdx(col);
    }
    if (typeof col === 'undefined') {
      return;
    }
    var i, cell, rowNum = this.taskTable.getNumRows();
    for (i = 0; i < rowNum; ++i) {
      cell = this.taskTable.getCell(i, col);
      if (useID && (this.getID(cell.getText()) === this.getID(target))) {
      // compare using ID 
        return cell;
      } else if (cell.getText() === target) {
      // compare the full string
        return cell;
      }
    }
    return;
  },
  
  cleanTask: function(type, taskName, alert) {
    //debug('from: ' + type);
    var i;
    if (typeof type === 'undefined') {
      return;
    }
    if (type === 'All') {
      for (i = 0; i < this.header.length; ++i) {
        this.cleanTask(this.header[i], taskName);
      }
      return;
    }
    
    var cell = this.findFirstCell(type, taskName);   
    if (typeof cell === 'undefined') {
      if (alert) {
        DocumentApp.getUi().alert('cannot find task name: ' + taskName);
      }
    } else {
      cell.clear();
    }
  },
  
  // Change the color of a task according to its current type
  setTaskColor: function(type, taskName) {
    setColor = (function (type, ele) {
      if (!ele) return;
      ele.asText().editAsText().setForegroundColor(this.headerColor[this.getColIdx(type)])
    }).bind(this, type);
    // Change the color of the task in the task table
    var timeStamp = this.getTimeStamp(taskName);
    var body = DocumentApp.getActiveDocument().getBody();
    var re = body.findText(timeStamp);
    setColor(re.getElement());
    
    // If the task exists in the main body, change its color, too. 
    re = body.findText(timeStamp, re);
    if (re) {
      setColor(re.getElement());
    }
    
  }, 
  
  addTask: function(type, taskName) {
    cell = this.findFirstEmptyCell(type);
    if (typeof cell === 'undefined') {
      this.appendRow(1);
      cell = this.taskTable.getCell(this.taskTable.getNumRows() - 1, this.getColIdx(type));
    }
    cell.setText(taskName);
    this.setTaskColor(type, taskName);
  },
  
  moveTask: function(from, to, taskName) {
    this.cleanTask(from, taskName);
    this.addTask(to, taskName);
  },
  
  mutateRow: function(row, rowContent) {
    var i;
    for (i = 0; i < rowContent.length; ++i) {
      row.appendTableCell(rowContent[i]);
    }
    return this;
  },
  
  appendRow: function(rowContent) {
    var i, rc = this._emptyRowContent();
    if (typeof rowContent === 'number') {
      for (i = 0; i < rowContent; ++i) {
        this.appendRow(rc);
      }
      return this
    }
    var row = this.taskTable.appendTableRow();
    this.mutateRow(row, rowContent);
    return this
  },
  
  getCurrentSelection: function() {
    var res = '';
    var selection = DocumentApp.getActiveDocument().getSelection();
    if (selection) {
      var elements = selection.getRangeElements();
      for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        
        // Only get text from elements that can be edited as text; skip images and other non-text elements.
        if (element.getElement().editAsText) {
          var text = element.getElement().editAsText();
          
          // Bold the selected part of the element, or the full element if it's completely selected.
          if (element.isPartial()) {
            res += text.getText().slice(element.getStartOffset(), element.getEndOffsetInclusive() + 1);
          } else {
            res += text.getText();
          }
        }
      }
    }
    return res;
  },
  
  getTimeStamp: function(s) {
    //FIXME now it only checks brackets
    return s.split(']')[0].split('[')[1];
  },
  
  selectBackwardToTimestamp: function() {
    var cursor = DocumentApp.getActiveDocument().getCursor();
    if (!cursor) {
      return;
    }
    var ele = cursor.getElement();
    var selectTexts = [], text, i;
    if (ele.getType() === DocumentApp.ElementType.TEXT) {
      ele = ele.getParent();
    }
    if (ele.getType() === DocumentApp.ElementType.PARAGRAPH) {
      for (i = 0; i < 10 && ele; ++i) {
        text = ele.asText().getText();
        if (typeof this.getTimeStamp(text) !== 'undefined') {
          selectTexts.push(text);          
          break;
        }
        selectTexts.push(text);
        ele = ele.getPreviousSibling();    
      } 
    }
    selectTexts.reverse();
    return selectTexts.join('\n');
  },

  
  // this function returns the selected task
  // if any text is selected, the function will return the selected text
  // else the function will return the surrounding text of current cursor.
  getSelectedTask: function() {
    var selectedText = this.getCurrentSelection();
    if (selectedText.length > 0) {
      return selectedText;
    }
    return this.selectBackwardToTimestamp();
  },
  
  appendLogEntry: function() {
  },
  
  _isTaskTable: function(table) {
    var i;
    for (i = 0; i < this.header.length; ++i) {
      if (table.getCell(0, i).getText() != this.header[i]) {
        return false;
      }
    }
    return true;
  },
  
  _emptyRowContent: function() {
    var rowContent = [], i;
    for (i = 0; i < this.header.length; ++i) {
      rowContent.push('');
    }
    return rowContent;
  },

  _createDefaultTableContent: function () {
    var tableContent = [this.header];
    var rowContent = [];
    var i;
    for (i = 0; i < this.header.length; ++i) {
      rowContent.push('');
    }
    for (i = 0; i < this.defaultRows; ++i) {
      tableContent.push(rowContent);
    }
    return tableContent;
  },
  
  _createDefaultGTDTable: function (body) {
    // Build a table from the header.
    var table = body.insertTable(0, this._createDefaultTableContent());
    assert(this.header.length === this.headerColor.length, 'wrong number of color');
    for (i = 0; i < this.header.length; ++i) {
      table.getCell(0, i)
        .editAsText()
        .setForegroundColor(this.headerColor[i]);
    }
    return table;
  },
  
  body: DocumentApp.getActiveDocument().getBody(),
  header: ['Actionable', 'Waiting For', 'Done'],
  headerColor: ['#ff0000', '#9d922e', '#16a031'], 
  defaultRows: 1,
  templates: {},
};


app.initTaskTable();

function initTaskFunction() {
  app.initTaskTable();
}

function createActionableTask() {
  var task = app.getSelectedTask();
  if (!task) {
    DocumentApp.getUi().alert('cannot find task name');
    return;
  }
  //debug('task name: ' + task);
  app.cleanTask('All', task);
  app.addTask('Actionable', task);
}

function moveTaskToWaitingFor() {
  var task = app.getSelectedTask();
  if (!task) {
    DocumentApp.getUi().alert('cannot find task name');
    return;
  }
  app.cleanTask('All', task);
  app.addTask('Waiting For', task);
}

function moveTaskToDone() {
  var task = app.getSelectedTask();
  if (!task) {
    DocumentApp.getUi().alert('cannot find task name');
    return;
  }
  app.cleanTask('All', task);
  app.addTask('Done', task);
}


function showSidebar() {
  var sidebarHTML = Mustache.to_html(app.templates.sidebar, app.getSideBarTableContent());
  // debug(JSON.stringify(app.getSideBarTableContent()));
  // debug(sidebarHTML);
  var html = HtmlService.createHtmlOutput(sidebarHTML)
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setTitle('My task list')
      .setWidth(300);
      
  DocumentApp.getUi() // Or DocumentApp or FormApp.
      .showSidebar(html);
}

function onOpen() {
  var ui = DocumentApp.getUi();
  // Or DocumentApp or FormApp.
  ui.createMenu('GTD')
      .addItem('insert date', 'insertDate')
      .addItem('create task table', 'initTaskFunction')
      .addItem('move to Actionable', 'createActionableTask')
      .addItem('move to WaitingFor', 'moveTaskToWaitingFor')
      .addItem('move to Done', 'moveTaskToDone')
      .addItem('show task sidebar', 'showSidebar')
      .addToUi();
}


app.templates.sidebar = "<link rel='stylesheet' href='https://ssl.gstatic.com/docs/script/css/add-ons.css'><script src='https://code.jquery.com/jquery-2.1.3.min.js'></script><style>.collapse{  font-size: 20px;  display:block;}.collapse + input{  display:none;}.collapse + input + *{  display:none;}.collapse+ input:checked + *{  display:block;}</style><div align='right'>    <input type='button' value='Refresh' onclick='google.script.run.showSidebar()' /></div><div>{{#task_queues}}<div>    <label class='collapse' style='color: {{color}}' for='_{{index}}'>{{type}}</label>    <input id='_{{index}}' type='checkbox' checked='checked'>    <div>        <ul>        {{#tasks}}            <li>{{name}}</li>        {{/tasks}}        </ul>    </div></div>{{/task_queues}}</div>";

/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */

/*global define: false*/

(function (global, factory) {
  if (typeof exports === "object" && exports) {
    factory(exports); // CommonJS
  } else if (typeof define === "function" && define.amd) {
    define(['exports'], factory); // AMD
  } else {
    factory(global.Mustache = {}); // <script>
  }
}(this, function (mustache) {

  var Object_toString = Object.prototype.toString;
  var isArray = Array.isArray || function (object) {
    return Object_toString.call(object) === '[object Array]';
  };

  function isFunction(object) {
    return typeof object === 'function';
  }

  function escapeRegExp(string) {
    return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
  }

  // Workaround for https://issues.apache.org/jira/browse/COUCHDB-577
  // See https://github.com/janl/mustache.js/issues/189
  var RegExp_test = RegExp.prototype.test;
  function testRegExp(re, string) {
    return RegExp_test.call(re, string);
  }

  var nonSpaceRe = /\S/;
  function isWhitespace(string) {
    return !testRegExp(nonSpaceRe, string);
  }

  var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
  };

  function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
  }

  var whiteRe = /\s*/;
  var spaceRe = /\s+/;
  var equalsRe = /\s*=/;
  var curlyRe = /\s*\}/;
  var tagRe = /#|\^|\/|>|\{|&|=|!/;

  /**
   * Breaks up the given `template` string into a tree of tokens. If the `tags`
   * argument is given here it must be an array with two string values: the
   * opening and closing tags used in the template (e.g. [ "<%", "%>" ]). Of
   * course, the default is to use mustaches (i.e. mustache.tags).
   *
   * A token is an array with at least 4 elements. The first element is the
   * mustache symbol that was used inside the tag, e.g. "#" or "&". If the tag
   * did not contain a symbol (i.e. {{myValue}}) this element is "name". For
   * all text that appears outside a symbol this element is "text".
   *
   * The second element of a token is its "value". For mustache tags this is
   * whatever else was inside the tag besides the opening symbol. For text tokens
   * this is the text itself.
   *
   * The third and fourth elements of the token are the start and end indices,
   * respectively, of the token in the original template.
   *
   * Tokens that are the root node of a subtree contain two more elements: 1) an
   * array of tokens in the subtree and 2) the index in the original template at
   * which the closing tag for that section begins.
   */
  function parseTemplate(template, tags) {
    if (!template)
      return [];

    var sections = [];     // Stack to hold section tokens
    var tokens = [];       // Buffer to hold the tokens
    var spaces = [];       // Indices of whitespace tokens on the current line
    var hasTag = false;    // Is there a {{tag}} on the current line?
    var nonSpace = false;  // Is there a non-space char on the current line?

    // Strips all whitespace tokens array for the current line
    // if there was a {{#tag}} on it and otherwise only space.
    function stripSpace() {
      if (hasTag && !nonSpace) {
        while (spaces.length)
          delete tokens[spaces.pop()];
      } else {
        spaces = [];
      }

      hasTag = false;
      nonSpace = false;
    }

    var openingTagRe, closingTagRe, closingCurlyRe;
    function compileTags(tags) {
      if (typeof tags === 'string')
        tags = tags.split(spaceRe, 2);

      if (!isArray(tags) || tags.length !== 2)
        throw new Error('Invalid tags: ' + tags);

      openingTagRe = new RegExp(escapeRegExp(tags[0]) + '\\s*');
      closingTagRe = new RegExp('\\s*' + escapeRegExp(tags[1]));
      closingCurlyRe = new RegExp('\\s*' + escapeRegExp('}' + tags[1]));
    }

    compileTags(tags || mustache.tags);

    var scanner = new Scanner(template);

    var start, type, value, chr, token, openSection;
    while (!scanner.eos()) {
      start = scanner.pos;

      // Match any text between tags.
      value = scanner.scanUntil(openingTagRe);

      if (value) {
        for (var i = 0, valueLength = value.length; i < valueLength; ++i) {
          chr = value.charAt(i);

          if (isWhitespace(chr)) {
            spaces.push(tokens.length);
          } else {
            nonSpace = true;
          }

          tokens.push([ 'text', chr, start, start + 1 ]);
          start += 1;

          // Check for whitespace on the current line.
          if (chr === '\n')
            stripSpace();
        }
      }

      // Match the opening tag.
      if (!scanner.scan(openingTagRe))
        break;

      hasTag = true;

      // Get the tag type.
      type = scanner.scan(tagRe) || 'name';
      scanner.scan(whiteRe);

      // Get the tag value.
      if (type === '=') {
        value = scanner.scanUntil(equalsRe);
        scanner.scan(equalsRe);
        scanner.scanUntil(closingTagRe);
      } else if (type === '{') {
        value = scanner.scanUntil(closingCurlyRe);
        scanner.scan(curlyRe);
        scanner.scanUntil(closingTagRe);
        type = '&';
      } else {
        value = scanner.scanUntil(closingTagRe);
      }

      // Match the closing tag.
      if (!scanner.scan(closingTagRe))
        throw new Error('Unclosed tag at ' + scanner.pos);

      token = [ type, value, start, scanner.pos ];
      tokens.push(token);

      if (type === '#' || type === '^') {
        sections.push(token);
      } else if (type === '/') {
        // Check section nesting.
        openSection = sections.pop();

        if (!openSection)
          throw new Error('Unopened section "' + value + '" at ' + start);

        if (openSection[1] !== value)
          throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
      } else if (type === 'name' || type === '{' || type === '&') {
        nonSpace = true;
      } else if (type === '=') {
        // Set the tags for the next time around.
        compileTags(value);
      }
    }

    // Make sure there are no open sections when we're done.
    openSection = sections.pop();

    if (openSection)
      throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);

    return nestTokens(squashTokens(tokens));
  }

  /**
   * Combines the values of consecutive text tokens in the given `tokens` array
   * to a single token.
   */
  function squashTokens(tokens) {
    var squashedTokens = [];

    var token, lastToken;
    for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      token = tokens[i];

      if (token) {
        if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
          lastToken[1] += token[1];
          lastToken[3] = token[3];
        } else {
          squashedTokens.push(token);
          lastToken = token;
        }
      }
    }

    return squashedTokens;
  }

  /**
   * Forms the given array of `tokens` into a nested tree structure where
   * tokens that represent a section have two additional items: 1) an array of
   * all tokens that appear in that section and 2) the index in the original
   * template that represents the end of that section.
   */
  function nestTokens(tokens) {
    var nestedTokens = [];
    var collector = nestedTokens;
    var sections = [];

    var token, section;
    for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      token = tokens[i];

      switch (token[0]) {
      case '#':
      case '^':
        collector.push(token);
        sections.push(token);
        collector = token[4] = [];
        break;
      case '/':
        section = sections.pop();
        section[5] = token[2];
        collector = sections.length > 0 ? sections[sections.length - 1][4] : nestedTokens;
        break;
      default:
        collector.push(token);
      }
    }

    return nestedTokens;
  }

  /**
   * A simple string scanner that is used by the template parser to find
   * tokens in template strings.
   */
  function Scanner(string) {
    this.string = string;
    this.tail = string;
    this.pos = 0;
  }

  /**
   * Returns `true` if the tail is empty (end of string).
   */
  Scanner.prototype.eos = function () {
    return this.tail === "";
  };

  /**
   * Tries to match the given regular expression at the current position.
   * Returns the matched text if it can match, the empty string otherwise.
   */
  Scanner.prototype.scan = function (re) {
    var match = this.tail.match(re);

    if (!match || match.index !== 0)
      return '';

    var string = match[0];

    this.tail = this.tail.substring(string.length);
    this.pos += string.length;

    return string;
  };

  /**
   * Skips all text until the given regular expression can be matched. Returns
   * the skipped string, which is the entire tail if no match can be made.
   */
  Scanner.prototype.scanUntil = function (re) {
    var index = this.tail.search(re), match;

    switch (index) {
    case -1:
      match = this.tail;
      this.tail = "";
      break;
    case 0:
      match = "";
      break;
    default:
      match = this.tail.substring(0, index);
      this.tail = this.tail.substring(index);
    }

    this.pos += match.length;

    return match;
  };

  /**
   * Represents a rendering context by wrapping a view object and
   * maintaining a reference to the parent context.
   */
  function Context(view, parentContext) {
    this.view = view;
    this.cache = { '.': this.view };
    this.parent = parentContext;
  }

  /**
   * Creates a new context using the given view with this context
   * as the parent.
   */
  Context.prototype.push = function (view) {
    return new Context(view, this);
  };

  /**
   * Returns the value of the given name in this context, traversing
   * up the context hierarchy if the value is absent in this context's view.
   */
  Context.prototype.lookup = function (name) {
    var cache = this.cache;

    var value;
    if (name in cache) {
      value = cache[name];
    } else {
      var context = this, names, index, lookupHit = false;

      while (context) {
        if (name.indexOf('.') > 0) {
          value = context.view;
          names = name.split('.');
          index = 0;

          /**
           * Using the dot notion path in `name`, we descend through the
           * nested objects.
           *
           * To be certain that the lookup has been successful, we have to
           * check if the last object in the path actually has the property
           * we are looking for. We store the result in `lookupHit`.
           *
           * This is specially necessary for when the value has been set to
           * `undefined` and we want to avoid looking up parent contexts.
           **/
          while (value != null && index < names.length) {
            if (index === names.length - 1 && value != null)
              lookupHit = (typeof value === 'object') &&
                value.hasOwnProperty(names[index]);
            value = value[names[index++]];
          }
        } else if (context.view != null && typeof context.view === 'object') {
          value = context.view[name];
          lookupHit = context.view.hasOwnProperty(name);
        }

        if (lookupHit)
          break;

        context = context.parent;
      }

      cache[name] = value;
    }

    if (isFunction(value))
      value = value.call(this.view);

    return value;
  };

  /**
   * A Writer knows how to take a stream of tokens and render them to a
   * string, given a context. It also maintains a cache of templates to
   * avoid the need to parse the same template twice.
   */
  function Writer() {
    this.cache = {};
  }

  /**
   * Clears all cached templates in this writer.
   */
  Writer.prototype.clearCache = function () {
    this.cache = {};
  };

  /**
   * Parses and caches the given `template` and returns the array of tokens
   * that is generated from the parse.
   */
  Writer.prototype.parse = function (template, tags) {
    var cache = this.cache;
    var tokens = cache[template];

    if (tokens == null)
      tokens = cache[template] = parseTemplate(template, tags);

    return tokens;
  };

  /**
   * High-level method that is used to render the given `template` with
   * the given `view`.
   *
   * The optional `partials` argument may be an object that contains the
   * names and templates of partials that are used in the template. It may
   * also be a function that is used to load partial templates on the fly
   * that takes a single argument: the name of the partial.
   */
  Writer.prototype.render = function (template, view, partials) {
    var tokens = this.parse(template);
    var context = (view instanceof Context) ? view : new Context(view);
    return this.renderTokens(tokens, context, partials, template);
  };

  /**
   * Low-level method that renders the given array of `tokens` using
   * the given `context` and `partials`.
   *
   * Note: The `originalTemplate` is only ever used to extract the portion
   * of the original template that was contained in a higher-order section.
   * If the template doesn't use higher-order sections, this argument may
   * be omitted.
   */
  Writer.prototype.renderTokens = function (tokens, context, partials, originalTemplate) {
    var buffer = '';

    var token, symbol, value;
    for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
      value = undefined;
      token = tokens[i];
      symbol = token[0];

      if (symbol === '#') value = this._renderSection(token, context, partials, originalTemplate);
      else if (symbol === '^') value = this._renderInverted(token, context, partials, originalTemplate);
      else if (symbol === '>') value = this._renderPartial(token, context, partials, originalTemplate);
      else if (symbol === '&') value = this._unescapedValue(token, context);
      else if (symbol === 'name') value = this._escapedValue(token, context);
      else if (symbol === 'text') value = this._rawValue(token);

      if (value !== undefined)
        buffer += value;
    }

    return buffer;
  };

  Writer.prototype._renderSection = function (token, context, partials, originalTemplate) {
    var self = this;
    var buffer = '';
    var value = context.lookup(token[1]);

    // This function is used to render an arbitrary template
    // in the current context by higher-order sections.
    function subRender(template) {
      return self.render(template, context, partials);
    }

    if (!value) return;

    if (isArray(value)) {
      for (var j = 0, valueLength = value.length; j < valueLength; ++j) {
        buffer += this.renderTokens(token[4], context.push(value[j]), partials, originalTemplate);
      }
    } else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
      buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate);
    } else if (isFunction(value)) {
      if (typeof originalTemplate !== 'string')
        throw new Error('Cannot use higher-order sections without the original template');

      // Extract the portion of the original template that the section contains.
      value = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);

      if (value != null)
        buffer += value;
    } else {
      buffer += this.renderTokens(token[4], context, partials, originalTemplate);
    }
    return buffer;
  };

  Writer.prototype._renderInverted = function(token, context, partials, originalTemplate) {
    var value = context.lookup(token[1]);

    // Use JavaScript's definition of falsy. Include empty arrays.
    // See https://github.com/janl/mustache.js/issues/186
    if (!value || (isArray(value) && value.length === 0))
      return this.renderTokens(token[4], context, partials, originalTemplate);
  };

  Writer.prototype._renderPartial = function(token, context, partials) {
    if (!partials) return;

    var value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
    if (value != null)
      return this.renderTokens(this.parse(value), context, partials, value);
  };

  Writer.prototype._unescapedValue = function(token, context) {
    var value = context.lookup(token[1]);
    if (value != null)
      return value;
  };

  Writer.prototype._escapedValue = function(token, context) {
    var value = context.lookup(token[1]);
    if (value != null)
      return mustache.escape(value);
  };

  Writer.prototype._rawValue = function(token) {
    return token[1];
  };

  mustache.name = "mustache.js";
  mustache.version = "2.0.0";
  mustache.tags = [ "{{", "}}" ];

  // All high-level mustache.* functions use this writer.
  var defaultWriter = new Writer();

  /**
   * Clears all cached templates in the default writer.
   */
  mustache.clearCache = function () {
    return defaultWriter.clearCache();
  };

  /**
   * Parses and caches the given template in the default writer and returns the
   * array of tokens it contains. Doing this ahead of time avoids the need to
   * parse templates on the fly as they are rendered.
   */
  mustache.parse = function (template, tags) {
    return defaultWriter.parse(template, tags);
  };

  /**
   * Renders the `template` with the given `view` and `partials` using the
   * default writer.
   */
  mustache.render = function (template, view, partials) {
    return defaultWriter.render(template, view, partials);
  };

  // This is here for backwards compatibility with 0.4.x.
  mustache.to_html = function (template, view, partials, send) {
    var result = mustache.render(template, view, partials);

    if (isFunction(send)) {
      send(result);
    } else {
      return result;
    }
  };

  // Export the escaping function so that the user may override it.
  // See https://github.com/janl/mustache.js/issues/244
  mustache.escape = escapeHtml;

  // Export these mainly for testing, but also for advanced usage.
  mustache.Scanner = Scanner;
  mustache.Context = Context;
  mustache.Writer = Writer;

}));


