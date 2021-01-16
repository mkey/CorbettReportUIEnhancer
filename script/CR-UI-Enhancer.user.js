// ==UserScript==
// @name         CR UI Enhancer
// @namespace    https://gist.github.com/mkey/5a2872b0792e1e412540e9cdee2ed1bd
// @version      0.1
// @description  CorbettReport User interface enghancer script. Visit https://gist.github.com/mkey/5a2872b0792e1e412540e9cdee2ed1bd for details.
// @author       mkey
// @match        https://www.corbettreport.com/*
// @match        https://www.corbettreport.com/wp-admin/profile.php
// @resource     QUILLCSS https://cdn.quilljs.com/1.3.6/quill.snow.css
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @require      https://cdn.quilljs.com/1.3.6/quill.js
// ==/UserScript==

(function()
 {
    'use strict';
    //
    class settingsClass {
        constructor() {
            this.settings = {
                commentsSortOrder: true,
                commentsSortOrderDefault: 0,
                subscriptionSetting: 0,
                richTextEditor: true,
                autoSaveComments: false
            }
            //
            let settings = GM_getValue('CR_UI_SETTINGS', null);
            if (settings !== null) { this.settings = JSON.parse(settings);}
        }
        //
        save() {
            GM_setValue('CR_UI_SETTINGS', JSON.stringify(this.settings));
        }
    }
    const SETTINGS = new settingsClass();
    //
    commentsSection(document.getElementById('comment'), SETTINGS.settings);
    //
    profileSettings(document.getElementById('profile-page'), SETTINGS);
    //
    // settings that can be configured on the wordpress admin page
    function profileSettings(pp, SETTINGS) {
        if (!pp) { return; }
        //
        let style = [];
        style.push('.cr_ui_so_ss > div { padding: 0.5em 0 0.5em; margin: 1em 0; }');
        style.push('.cr_ui_so_ss > input { width: 15em; }');
        style.push('.cr_ui_so_ss div div { display: inline-block; width: 15.6em; font-size: 14px; font-weight: 600; }');
        style.push('.cr_ui_so_ss div div select { max-width: none; }');
        style.push('.cr_ui_so_ss div div + div { width: 50em; }');
        setStyle(style);
        //
        pp.appendChild(document.createElement('hr'));
        let frame = document.createElement('div');
        frame.className = 'cr_ui_so_ss';
        pp.appendChild(frame);
        //
        const settings = SETTINGS.settings;
        const sortOrderOptions = ['Default (as is)', 'Chronological descending', 'Chronological ascending', 'Own comment threads only'];
        const subscriptionOptions = ['Do Not Send Email Notifications.', 'Send Email Notification ONLY If Someone Replies To My Comment(s).', 'Send Email Notification Whenever A New Comment Is Posted.'];
        //
        // alter the comment sort order
        let commentSortOrderCheckbox = createCheckbox(frame, 'Alter the comment sort order', settings.commentsSortOrder);
        // default comment sort order select box
        let commentSortOrderSelect = createSelect(frame, 'Default comment sort order', sortOrderOptions, settings.commentsSortOrderDefault);
        // save the subscription setting checkbox
        let subscriptionCheckbox = createSelect(frame, 'Default subscription setting', subscriptionOptions, settings.subscriptionSetting);
        // auto save/backup comments to prevent accidental loss
        let autoSaveCommentsCheckbox = createCheckbox(frame, 'Auto backup comments', settings.autoSaveComments, true);
        // rich text editor setting checkbox
        let richTextCheckbox = createCheckbox(frame, 'Use the rich text editor', settings.richTextEditor);
        //
        createButton(frame, 'Save CR UI Enhancer settings', saveSettings);
        //
        function createButton(frame, text, fn) {
            let save = document.createElement('input');
            save.className = 'button button-primary';
            save.type = 'button';
            save.value = text;
            frame.appendChild(save);
            save.addEventListener('click', fn, false);
        }
        //
        function saveSettings(e) {
            settings.commentsSortOrder = commentSortOrderCheckbox.checked;
            settings.commentsSortOrderDefault = commentSortOrderSelect.selectedIndex;
            settings.subscriptionSetting = subscriptionCheckbox.selectedIndex;
            settings.richTextEditor = richTextCheckbox.checked;
            //
            SETTINGS.save();
            e.target._value = e.target.value
            e.target.value = 'Saved!';
            window.setTimeout(() => { e.target.value = e.target._value; }, 2500);
        }
        //
        function createSelect(frame, text, options, setting) {
            let div = document.createElement('div');
            let div1 = document.createElement('div');
            //
            let span = document.createElement('span');
            span.textContent = text;
            div1.appendChild(span);
            div.appendChild(div1);
            //
            div1 = document.createElement('div');
            //
            let select = document.createElement('select');
            for (let i = 0, i_max = options.length; i < i_max; i++) { select.appendChild(createOption(options[i])); }
            select.selectedIndex = setting;
            //
            div1.appendChild(select);
            div.appendChild(div1);
            frame.appendChild(div);
            return select;
            //
            function createOption(text) {
                let option = document.createElement('option');
                option.textContent = text;
                return option
            }
        }
        //
        function createCheckbox(frame, text, setting, disabled) {
            let div = document.createElement('div');
            let div1 = document.createElement('div');
            //
            let span = document.createElement('span');
            span.textContent = text;
            div1.appendChild(span);
            div.appendChild(div1);
            //
            div1 = document.createElement('div');
            //
            let cb = document.createElement('input');
            cb.type = 'checkbox';
            if (disabled){ cb.disabled = true; }
            cb.checked = setting;
            //
            div1.appendChild(cb);
            div.appendChild(div1);
            frame.appendChild(div);
            //
            return cb;
        }
    }
    //
    function commentsSection(cs, settings) {
        if (!cs) { return; }
        //
        subscriptionSettings(document.getElementById('subscribe-reloaded'), settings.subscriptionSetting);
        //
        richTextComment(cs, settings.richTextEditor);
        //
        if (settings.commentsSortOrder !== true){ return; }
        //
        class autoSaveClass {
            //
            constructor(){
                this.data = null;
                //
                //GM_deleteValue('AUTOSAVE_DATA');
                //console.log(GM_listValues());
                //
                this.get();
                this.prune();
            }
            //
            prune() {
                //
                let day = Math.floor((new Date()).valueOf()/86400000);
                let data = this.data;
                //
                if (day === data.pruneDay){ return; }
                //
                // lets run this once per week
                data.pruneDay = day+7;
                day -= 7;
                //
                for (let i = data.data.length; i > 0; i--){
                    if (data.data[i].created/86400 < day){
                        data.data.splice(i, 1);
                    }
                }
                //
                this.set();
            }
            //
            add(msg) {
                let path = document.location.pathname;
                let data = this.data.data;
                //
                data.push({
                    created: Math.floor((new Date()).valueOf()/1000)
                    , path: path
                    , msg: msg
                });
            }
            //
            get() {
                this.data = JSON.parse(GM_getValue('AUTOSAVE_DATA', '{ "pruneDay": 0, "data": [] }'));
            }
            //
            set() {
                GM_setValue('AUTOSAVE_DATA', JSON.stringify(this.data));
            }
        }
        const autoSave = new autoSaveClass();
        //
        let list = document.getElementsByClassName('commentlist');
        if (!list){ return; }
        list = list[0];
        //
        let displayName = document.getElementsByClassName('display-name');
        if (!displayName){ return; }
        displayName = displayName[0].textContent.trim();
        //
        const comments = [];
        //
        commentSortOrder(list, displayName, comments, settings.commentsSortOrderDefault);
        //
        // provide a rich text comment box and fix the character counter
        function richTextComment(comment, setting) {
            if (!comment || setting !== true){ return; }
            //
            GM_addStyle(GM_getResourceText("QUILLCSS"));
            //
            const regex_cl = /<p>/g;
            const regex_nl = /<br><\/p>|<\/p>|<br>/g;
            const regex_bq = /<\/blockquote><blockquote>/g;
            const regex_nl2 = /\r\n/g;
            //
            const CHAR_COUNT = 3000;
            //
            let div = document.createElement('div');
            div.id = 'comment-div';
            //div.style.minHeight = '12em';
            div.style.maxHeight = '36em';
            div.style.overflow = 'auto';
            //
            //comment.style.display = 'none';
            comment.style.height = 0;
            comment.style.opacity = 0;
            comment.style.padding = 0;
            comment.parentNode.appendChild(div);
            //
            class Counter {
                constructor(quill, options) {
                    this.quill = quill;
                    this.options = options;
                    this.counter = document.querySelector(options.container);
                    //
                    quill.root.innerHTML = '<p>' + comment.value.replace(regex_nl2, '<\p><p>') + '</p>';
                    quill.on('text-change', this.update.bind(this));
                    //
                    comment.addEventListener('focus', (e) => { document.getElementsByClassName('ql-editor')[0].focus(); }, false);
                    //
                    this.textArea = comment;
                    this.update();// Account for initial contents
                }
                //
                update() {
                    let count = CHAR_COUNT - this.quill.getText().trim().length;
                    this.counter.style.backgroundColor = (count >= 0) ? '' : 'red';
                    this.counter.value = count;
                    //
                    this.textArea.value = this.quill.root.innerHTML
                        .replace(regex_cl, '')
                        .replace(regex_nl, '\r\n')
                        .replace(regex_bq, '\r\n')
                        .trim();
                }
            }
            //
            Quill.register('modules/counter', Counter);
            //
            let quill = new Quill('#comment-div', {
                theme: 'snow',
                modules: {
                    counter: { container: '#commentlen' },
                    toolbar: {
                        handlers: {
                            /*
                        'blockquote': function(value){
                            let f = this.quill.getFormat();
                            //
                            let range = this.quill.getSelection();
                            this.quill.formatText(range.index, range.length, 'blockquote', (f.blockquote === true) ? false : true);
                            //
                            //this.quill.format('blockquote', (f.blockquote === true) ? false : true);
                        }*/
                        },
                        container: [
                            ['bold', 'italic', 'strike'],
                            ['blockquote', 'code'],
                            ['link'],
                            ['clean']
                        ]
                    }
                }
            });
        }
        //
        // comment sort order alteration
        function commentSortOrder(list, displayName, comments, setting) {
            let style = [];
            style.push('.cr_ui_so_tb { float: right; clear: both; }');
            style.push('.cr_ui_so_tb span { border: 0.1em #848484 solid; padding: 0em 0.2em; margin: 0 0.2em; user-select: none; cursor: default; color: #0000ff; border-radius: 0.2em; }');
            style.push('.cr_ui_so_tb span:hover { opacity: 0.8; border-color: #d0d0d0; }');
            setStyle(style);
            //
            let li = list.getElementsByTagName('li');
            //
            for (let i = 0, i_max = li.length; i < i_max; i++) {
                // create the navigation toolbar
                let cite = li[i].getElementsByTagName('cite')[0];
                cite.parentNode.appendChild(createToolbar());
                //
                let userName = cite.textContent.trim();
                // calculate the creation date
                let a = li[i].getElementsByClassName('comment-meta commentmetadata')[0].getElementsByTagName('a')[0];
                let m = a.textContent.trim().match(/(\d+|am|pm)/g);//[ "01", "08", "2021", "4", "46", "pm" ]
                //
                let date = new Date(0);
                date.setYear(Number(m[2]));
                date.setMonth(Number(m[0])-1);
                date.setDate(Number(m[2]));
                date.setHours(Number(m[3]) + ((m[5] === 'am') ? 0 : 12));
                date.setMinutes(Number(m[4]));
                // create the comment structure
                let comment = {
                    originalParent: li[i].parentNode._comment
                    , originalParentDOM: li[i].parentNode // store original parent
                    , DOM: li[i] // comment dom (li)
                    , id: a.href.split('-').pop() //comment id
                    , created: date.valueOf() //comment created date, unused ATM
                    , userName: userName
                    , own: (userName === displayName) ? true : false
                    , ownThread: null
                    , URL: a.href
                }
                // attach the structure pointer to the ul element in li, of it exists
                let u = li[i].getElementsByTagName('ul');
                if (u.length > 0){ u[0]._comment = comment; }
                // if parent is in own thread, mark this child comment as same
                let parentComment = comment.originalParent;
                comment.ownThread = ((parentComment !== undefined && parentComment.ownThread === true) ? true : false) || comment.own;
                // add "in reply to:"
                if (parentComment !== undefined) {
                    let span = cite.parentNode.getElementsByTagName('span')[0];
                    span.innerHTML = 'replies to: <a href= ' + parentComment.URL + '>' + parentComment.userName +'</a>';
                }
                //
                comments.push(comment);
            }
            // check for comments in reply to own comments
            for (let i = comments.length-1, comment, parentComment; i >= 0; i--) {
                comment = comments[i];
                parentComment = comment.originalParent;
                //
                /*console.log(comment.id, comment.own, comment.userName, comment.ownThread
                        , (parentComment) ? parentComment.id : null
                        , (parentComment) ? parentComment.userName : null
                        , (parentComment) ? parentComment.ownThread : null);*/
                //
                if (parentComment === undefined || parentComment.ownThread === true || comment.ownThread !== true){ continue; }
                //
                parentComment.ownThread = true;
            }
            // sort comments chronologically by default
            comments.sort((a, b) => { return (a.id > b.id) ? 1 : -1; });
            //
            switch (settings.commentsSortOrderDefault) {
                case 0: defaultSortOrder(); break;
                case 1: chronologicalSortOrderDesc(); break;
                case 2: chronologicalSortOrderAsc(); break;
                case 3: showOnlyOwnComments(); break;
            }
            //
            function createToolbar() {
                let div = document.createElement('span');
                div.className = 'cr_ui_so_tb';
                //
                div.appendChild(createButton('Def', 'Default sort order', defaultSortOrder));
                div.appendChild(createButton('Dsc', 'Chronological sort order, descending', chronologicalSortOrderDesc));
                div.appendChild(createButton('Asc', 'Chronological sort order, ascending', chronologicalSortOrderAsc));
                div.appendChild(createButton('Own', 'View only replies to my comments', showOnlyOwnComments));
                //
                return div;
                //
                function createButton(name, title, fn) {
                    let b = document.createElement('span');
                    b.textContent = name;
                    b.title = title;
                    b.addEventListener('click', fn, false);
                    return b;
                }
            }
            //
            function defaultSortOrder() {
                for (let i = 0, i_max = comments.length, comment; i < i_max; i++) {
                    comment = comments[i];
                    comment.originalParentDOM.appendChild(comment.DOM);
                }
            }
            //
            function chronologicalSortOrderDesc() {
                for (let i = comments.length-1; i >= 0; i--) {
                    list.appendChild(comments[i].DOM);
                }
            }
            //
            function chronologicalSortOrderAsc() {
                for (let i = 0, i_max = comments.length; i < i_max; i++) {
                    list.appendChild(comments[i].DOM);
                }
            }
            //
            function showOnlyOwnComments() {
                for (let i = 0, i_max = comments.length, comment; i < i_max; i++) {
                    comment = comments[i];
                    //console.log(comment.ownThread, comment.own, comment.userName)
                    if (comment.ownThread === true) {
                        comment.originalParentDOM.appendChild(comment.DOM);
                    } else if (comment.DOM.parentNode) {
                        comment.DOM.parentNode.removeChild(comment.DOM);
                    }
                }
            }
        }
        //
        // save and restore the comment subscription setting automatically
        function subscriptionSettings(sub, setting) {
            if (!sub){ return; }
            //
            //sub.selectedIndex = GM_getValue('SUBSCRIPTION-SETTING', 0);
            sub.selectedIndex = setting;
            //
            //sub.addEventListener('change', () => { settings.subscriptionSetting = sub.selectedIndex; settings.save(); }, false);
        }
    }
    //
    function setStyle(s) {
        let style = document.createElement('style');
        style.textContent = s.join(' ');
        document.head.appendChild(style);
    }
    //
})();
