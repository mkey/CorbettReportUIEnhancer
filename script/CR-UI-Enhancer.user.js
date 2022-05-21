// ==UserScript==
// @name         CR UI Enhancer
// @namespace    https://github.com/mkey/CorbettReportUIEnhancer/
// @version      0.32
// @description  CorbettReport User interface enghancer script. Visit https://github.com/mkey/CorbettReportUIEnhancer/ for details.
// @author       mkey
// @homepage     https://github.com/mkey/
// @updateURL    https://github.com/mkey/CorbettReportUIEnhancer/raw/main/script/CR-UI-Enhancer.user.js
// @downloadURL  https://github.com/mkey/CorbettReportUIEnhancer/raw/main/script/CR-UI-Enhancer.user.js
// @match        https://www.corbettreport.com
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
    const SETTINGS = getSettings();
    const comment = document.getElementById('comment');
    const editbox = document.getElementsByClassName('sce-comment-text');
    const profile = document.getElementById('profile-page');
    //
    const SEARCH_ENGINE = 'https://metager.org/meta/meta.ger3?eingabe=';
    //
    articles(comment, editbox, SETTINGS.settings);
    //
    otherPages(profile, comment, SETTINGS.settings);
    //
    profilePage(profile, SETTINGS);
    //
    function articles(cs, eb, settings) {
        if (!cs) { return; }
        //
        addStyles(settings, 0);
        //
        subscriptionSettings(document.getElementById('subscribe-reloaded'), settings.subscriptionSetting);
        //
        // wait for extra sce-comment-text to be removed
        window.setTimeout(function() {
            richTextComment(cs, 'comment-div', 'commentlen', settings.richTextEditor);
            //console.log(eb[0].parentNode);
            for (let i = 0, i_max = eb.length; i < i_max; i++) {
                richTextComment(eb[i], 'comment-div' + i, null, settings.richTextEditor);
            }
        }, 5);
        //
        let list = document.getElementsByClassName('commentlist');
        if (!list){ return; }
        list = list[0];
        //
        unreadComments(list, settings.trackLastRead);
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
        //
        const autoSave = new autoSaveClass();
        //
        let displayName = document.getElementsByClassName('display-name');
        if (!displayName){ return; }
        displayName = displayName[0].textContent.trim();
        //
        const comments = [];
        //
        commentSortOrder(list, displayName, comments, settings.commentsSortOrderDefault);
        //
        // add IPFS URL to the article title
        addIpfsUrl();
        //
        // add a comment search button in an external search engine
        addCommentSearch();
        //
        // correct the scroll offset issue that happens because of style changes happening
        // a bit late in the page loading process. For comment andchored URLs only
        window.setTimeout(fixScroll, 1000);
        //
        //
        function fixScroll() {
            //document.location = document.location;
            // alternative
            let url = document.location.href.split('/#');
            if (url.length !== 2){ return; }
            //
            let li = document.getElementById(url[1]);
            if (li === null){ return; }
            //
            let pos = 0;
            while (li.offsetParent) {
                pos += li.offsetTop;
                li = li.offsetParent;
            }
            //
            window.scroll(0, pos);
        }
        //
        function unreadComments(list, setting) {
            if (!list || setting !== true){ return; }
            //
            let comments = [];
            const UNREAD = getUnread();
            //
            let li = list.getElementsByTagName('li');
            let max_id = 0, id;
            //
            for (let i = 0, i_max = li.length; i < i_max; i++) {
                id = Number(li[i].id.split('-')[1]);
                if (max_id < id) { max_id = id; }
                //
                comments.push({
                    li: li[i],
                    id: id
                });
            }
            //
            comments.sort((a, b) => { return (a.id > b.id) ? 1 : -1; });
            //
            let path = document.location.href.split('/')[3];
            let last_read_id = UNREAD.get(path, max_id);
            let last_read = last_read_id;
            //
            if (last_read > 0) {
                for (let i = 0, i_max = comments.length; i < i_max; i++) {
                    if (last_read_id === comments[i].id) {
                        last_read = i+1;
                        break;
                    }
                }
            } else if (last_read < 0) { last_read = comments.length; }
            //
            createToolbar(comments.length-last_read, document.getElementById('wp-admin-bar-top-secondary'));
            //
            //
            function createToolbar(count, ul1) {
                let div = document.createElement('div');
                let span = document.createElement('span');
                span.textContent = 'Unread comments: ' + count;
                div.appendChild(span);
                //
                let ul = document.createElement('ul');
                let li = document.createElement('li');
                li.textContent = 'Next';
                li.title = 'Go to next unread comment';
                li.addEventListener('click', goToNextUnread, false);
                ul.appendChild(li);
                //
                div.appendChild(ul);
                ul1.parentNode.insertBefore(div, ul1);
            }
            //
            function goToNextUnread() {
                if (last_read === comments.length){ return; }
                //
                let li = comments[last_read].li;
                let pos = 0;
                while (li.offsetParent) {
                    pos += li.offsetTop;
                    li = li.offsetParent;
                }
                //
                last_read++;
                window.scroll(0, pos);
            }
        }
        //
        // provide a rich text comment box and fix the character counter
        function richTextComment(box, boxId, counterId, setting) {
            //console.log(boxId, counterId);
            if (!box || setting !== true){ return; }
            //
            const regex_cl = /<p>/g;
            const regex_nl = /<br><\/p>|<\/p>|<br>/g;
            const regex_bq = /<\/blockquote><blockquote>/g;
            const regex_nl2 = /\r\n/g;
            //
            let div = document.createElement('div');
            div.id = boxId;
            //
            //comment.style.display = 'none';
            box.style.height = 0;
            box.style.opacity = 0;
            box.style.padding = 0;
            box.parentNode.appendChild(div);
            //
            class Counter {
                constructor(quill, options) {
                    this.CHAR_COUNT = 3000;
                    this.quill = quill;
                    this.options = options;
                    this.counter = (options.container) ? document.querySelector(options.container) : null;
                    //
                    let text = box.defaultValue;
                    //console.log(text, text.replace(regex_nl2, '<\p><p>'))
                    quill.root.innerHTML = '<p> ' + text.replace(regex_nl2, '<\p><p>') + '</p>'; // empty space after <p> is a fix/hack
                    quill.on('text-change', this.update.bind(this));
                    //
                    box.addEventListener('focus', (e) => { document.getElementsByClassName('ql-editor')[0].focus(); }, false);
                    //
                    this.textArea = box;
                    this.update();// Account for initial contents
                }
                //
                update() {
                    if (this.counter !== null) {
                        let count = this.CHAR_COUNT - this.quill.getText().trim().length;
                        this.counter.style.backgroundColor = (count >= 0) ? '' : 'red';
                        this.counter.value = count;
                    }
                    //
                    this.textArea.value = this.quill.root.innerHTML.replace(regex_cl, '').replace(regex_nl, '\r\n').replace(regex_bq, '\r\n').replace('&nbsp;','').trim();
                }
            }
            //
            Quill.register('modules/counter', Counter);
            //
            let quill = new Quill('#' + boxId, {
                theme: 'snow',
                modules: {
                    counter: { container: (counterId !== null) ? '#' + counterId : null },
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
            //
            let commentsSortOrder = {
                default: null,
                btns: []
            }
            //
            createToolbar(document.getElementById('wp-admin-bar-top-secondary'), commentsSortOrder.btns);
            //
            let li = list.getElementsByTagName('li'), file;
            //
            for (let i = 0, i_max = li.length; i < i_max; i++) {
                // create the navigation toolbar
                let cite = li[i].getElementsByTagName('cite')[0];
                //cite.parentNode.appendChild(createToolbar());
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
                    , id: Number(a.href.split('-').pop()) //comment id
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
                CreateEmailButton(cite.parentNode);
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
            //
            // sort comments chronologically by default
            comments.sort((a, b) => { return (a.id > b.id) ? 1 : -1; });
            //
            commentsSortOrder.default = commentsSortOrder.btns[(setting > 3) ? 0 : setting];
            //
            commentsSortOrder.default.click();
            //
            function CreateEmailButton(n) {
                let NS = 'http://www.w3.org/2000/svg';
                //
                let a = document.createElement('a');
                a.className = 'send-email-button';
                a.href = '#';
                //a.style.fontSize = '14px';
                a.title = 'Send this comment via email';
                a.setAttribute('download', 'message.eml');
                a.addEventListener('click', BuildEmail, false);
                //
                let svg = document.createElementNS(NS, 'svg');
                svg.setAttribute('xmlns', NS);
                svg.setAttribute('viewBox', '0 0 16 16');
                //
                let path = document.createElementNS(NS, 'path');
                path.setAttribute('stroke', 'currentColor');
                path.setAttribute('fill', 'transparent');
                path.setAttribute('d', 'M0.5 4 l14 0 l-7 5.5 l-7 -5.5 l0 10 l14 0 l0 -10');
                //
                svg.appendChild(path);
                a.appendChild(svg);
                //n.insertBefore(a, n.firstElementChild);
                n.appendChild(a);
            }
            //
            function BuildEmail(e) {
                let a = e.target;
                while (a.tagName !== 'A'){ a = a.parentNode; }
                //
                let comment = a.parentNode.parentNode;
                let URL = comment.getElementsByClassName('comment-meta commentmetadata')[0].getElementsByTagName('a')[0].href;
                //
                let text = [];
                text.push('Date: ' + new Date());
                //text.push('From: from');
                //text.push('Sender: Support@Cenosco.com');
                //text.push('Reply-To: Support@Cenosco.com');
                //text.push('SMTP: Support@Cenosco.com');
                //text.push('To: to');
                text.push('Subject: Comment from Corbettreport.com');
                text.push('X-Unsent: 1');
                text.push('Content-Type: text/html; charset=UTF-8');
                text.push('');
                text.push('<html><head><style>');
                text.push('.table { width: 60em; }');
                text.push('</style></head><body><table class="table"><tbody><tr><td>');
                text.push('Below comment is sent via email');
                text.push('<hr /></td></tr><tr><td>');
                text.push(HandleHTML(comment));
                text.push('</td></tr><tr><td class="issue-header"><br /><hr /><br />Original comment URL: ' + URL + '</td></tr>');
                text.push('</tbody></table></body></html>');
                //
                if (file !== null){ window.URL.revokeObjectURL(file); }
                file = window.URL.createObjectURL(new Blob([text.join('\r\n')], {type: 'message/rfc822; charset=UTF-8'}));
                //
                a.href = file;
                //
                window.setTimeout(2000, function() {
                    a.href = '#';
                    //debug(window.URL.revokeObjectURL(file));
                    file = null;
                });
                //
                function HandleHTML(html) {
                    html = html.cloneNode(true);
                    //
                    let btn = html.getElementsByClassName('send-email-button')[0];
                    btn.parentNode.removeChild(btn);
                    //
                    btn = html.getElementsByClassName('reply')[0];
                    btn.parentNode.removeChild(btn);
                    //
                    return html.innerHTML.trim();
                }
            }
            //
            function createToolbar(ul1, btns) {
                let div = document.createElement('div');
                let span = document.createElement('span');
                span.textContent = 'Comments sorting order';
                div.appendChild(span);
                //
                let ul = document.createElement('ul');
                ul.appendChild(createButton('Default', 'Default sort order', defaultSortOrder, btns));
                ul.appendChild(createButton('Descending', 'Chronological sort order, descending', chronologicalSortOrderDesc, btns));
                ul.appendChild(createButton('Ascending', 'Chronological sort order, ascending', chronologicalSortOrderAsc, btns));
                ul.appendChild(createButton('Threads', 'View only replies to my comments', showOnlyOwnComments, btns));
                //
                div.appendChild(ul);
                ul1.parentNode.insertBefore(div, ul1);
                //
                function createButton(name, title, fn, btns) {
                    let b = document.createElement('li');
                    b.textContent = name;
                    b.title = title;
                    b.addEventListener('click', fn, false);
                    btns.push(b);
                    return b;
                }
                /*
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
                */
            }
            //
            function defaultSortOrder(e) {
                if (checkButton(e.target) === false){ return; }
                //
                for (let i = 0, i_max = comments.length, comment; i < i_max; i++) {
                    comment = comments[i];
                    comment.originalParentDOM.appendChild(comment.DOM);
                }
            }
            //
            function chronologicalSortOrderDesc(e) {
                if (checkButton(e.target) === false){ return; }
                //
                for (let i = comments.length-1; i >= 0; i--) {
                    list.appendChild(comments[i].DOM);
                }
            }
            //
            function chronologicalSortOrderAsc(e) {
                if (checkButton(e.target) === false){ return; }
                //
                for (let i = 0, i_max = comments.length; i < i_max; i++) {
                    list.appendChild(comments[i].DOM);
                }
            }
            //
            function showOnlyOwnComments(e) {
                if (checkButton(e.target) === false){ return; }
                //
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
            //
            function checkButton(btn) {
                if (btn.className === 'btn-clicked-def'){ return false; }
                //
                commentsSortOrder.default.className = '';
                btn.className = 'btn-clicked-def';
                commentsSortOrder.default = btn;
                return true;
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
        //
        // add (a possible/eventual) IPFS alternative URL to the article header
        function addIpfsUrl() {
            let h1 = document.getElementsByTagName('h1');
            if (h1.length === 0){ return; }
            //
            h1 = h1[0];
            let a = h1.getElementsByTagName('a')[0];
            //
            let s = document.createElement('span');
            s.textContent = ' [ ';
            h1.appendChild(s);
            //
            let a1 = document.createElement('a');
            a1.title = 'This artice/video might be availabe on IPFS, there\'s only one way to find out';
            a1.href = a.href.replace('https://www.corbettreport.com/', 'https://ipfs.io/ipns/QmNqHuSVuufkBKK1LHtoUmKETobZriC1o5uoiXSoLX2i3K/');
            a1.textContent = 'IPFS';
            h1.appendChild(a1);
            //
            s = document.createElement('span');
            s.textContent = ' (?) ] ';
            h1.appendChild(s);
        }
    }
    //
    function otherPages(profile, comment, settings) {
        if (profile !== null || comment !== null){ return; }
        //
        addStyles(settings, 1);
        //
        // add a comment search button in an external search engine
        addCommentSearch();
    }
    //
    // settings that can be configured on the wordpress admin page
    function profilePage(pp, SETTINGS) {
        if (!pp) { return; }
        //
        addStyles(SETTINGS.settings, 2);
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
        // redesign page
        let redesignPageCheckbox = createCheckbox(frame, 'A non invasive restyle', settings.redesignPage);
        // dark mode
        let darkModeCheckbox = createCheckbox(frame, 'Dark mode, easy on your eyes', settings.darkMode);
        // track unread
        let trackLastReadCheckbox = createCheckbox(frame, 'Track last read comment', settings.trackLastRead);
        //
        createButton(frame, 'Save CR UI Enhancer settings', saveSettings);
        //
        function saveSettings(e) {
            settings.commentsSortOrder = commentSortOrderCheckbox.checked;
            settings.commentsSortOrderDefault = commentSortOrderSelect.selectedIndex;
            settings.subscriptionSetting = subscriptionCheckbox.selectedIndex;
            settings.richTextEditor = richTextCheckbox.checked;
            settings.redesignPage = redesignPageCheckbox.checked;
            settings.darkMode = darkModeCheckbox.checked;
            settings.trackLastRead = trackLastReadCheckbox.checked;
            //
            SETTINGS.save();
            e.target._value = e.target.value
            e.target.value = 'Saved!';
            window.setTimeout(() => { e.target.value = e.target._value; }, 2500);
        }
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
    //
    function addStyles(settings, page) {
        /*
          0 - articles
          1 - other pages
          2 - profile
        */
        //console.log(settings, page);
        if (settings.redesignPage === true || settings.darkMode === true) {
            let link = document.createElement('link');
            link.href = 'https://fonts.googleapis.com';
            link.rel = 'preconnect';
            document.head.appendChild(link);
            link = document.createElement('link');
            link.href = 'https://fonts.gstatic.com';
            link.rel = 'preconnect';
            link.crossorigin = true;
            document.head.appendChild(link);
            link = document.createElement('link');
            link.href = 'https://fonts.googleapis.com/css2?family=Merienda:wght@400;700&family=Roboto:ital,wght@0,400;0,700;1,400;1,700&display=swap';
            link.rel = 'stylesheet';
            document.head.appendChild(link);
        }
        //
        let s = [];
        //
        s.push('#searchform #submitbutton + input { font-weight: bold; font-size: 10pt; padding: 3px; cursor: pointer; }');
        //
        if (settings.darkMode === true) {
            // dark mode styling
            s.push('p::-moz-selection { color: black; background-color: #e1b240; }');
            s.push('p::selection { color: black; background-color: #e1b240; }');
            s.push('* { scrollbar-color: #202324 #454a4d; }');
            s.push('html, body, #related, div#topnav, table#textEdit tr, table#textEdit strong, .followit--follow-form-container, .followit--follow-form-container .form-preview { background-color: #1e2021!important; color: #b2aca2; }');
            //s.push('table#textEdit span { color: #b2aca2!important; }');
            s.push('#topnav { box-shadow: inset 0px 0px 10px #000; }');
            s.push('#topnav ul.clearfix > li.menu-item, #topnav ul.clearfix > li.menu-item > a { background-color: transparent; }');
            s.push('div#outer-wrap, #topnav .menu-item { background-color: #181a1b; border-color: #776e62; /*color: #e8e6e3;*/ }');
            s.push('div#outer-wrap, div#wrap, div#header, div#page, h3.widgettitle span { background-color: #181a1b; /*color: #e8e6e3;*/ }');
            s.push('.comment-body { background-color: #1e2021; }');
            //s.push('.comment-body blockquote, .entry blockquote { background-color: #181a1b; box-shadow: inset 0px 0px 10px #000; border-radius: 0.3em; color: #938d82; font-family: cursive; }');
            s.push('.comment-body blockquote, .entry blockquote { background-color: #181a1b; box-shadow: inset 0px 0px 10px #000; border-radius: 0.3em; color: #b5b1a9; font-family: Merienda, cursive; font-size: 0.9em; }');
            s.push('#topnav ul a, #topnav ul a:link, #topnav ul a:visited, #topnav ul a:hover, #topnav ul ul a:hover { background-color: #181a1b; color: #337dff; text-shadow: 0 1px 0 #111; }');
            s.push('.maincontent a, .maincontent a:link, .maincontent a:visited { color: #337dff; }');
            s.push('.button-submit { float: right; clear: both; }');
            s.push('#searchform #searchfield, #searchform #submitbutton, #searchform #submitbutton + input, #commentform .button-submit > input#submit, #commentlen, #subscribe-reloaded { background-color: #1e2021; border: 0.1em #ccc solid; color: #ccc; }');
            s.push('h1, h2, h3, h4, h5 { color: #b2aca2!important; }');
            s.push('h1.archive-title span, h2.feature-title span, h2.feat-title span, h3.widgettitle span { background-color: #181a1b; color: #b2aca2; }');
            s.push('#header + table tr { background-color: #1e2021; }');
            s.push('#header + table select { background-color: #181a1b; color: #b2aca2; }');
            s.push('div.sce-textarea textarea { background-color: #181a1b; color: #b2aca2; }');
            s.push('div.sce-textarea button { background-color: #181a1b; border-color: #776e62; color: #b2aca2; margin: 0.2em 0 0 0.2em; }');
            s.push('table.form-table label, table.form-table th { color: #b2aca2; };');
            //
            if (settings.commentsSortOrder === true) {
                s.push('#wpadminbar > div > div > ul li.btn-clicked-def { color: #d0d0d0; background-color: #181a1b; border-color: #d0d0d0; }');
            }
            //
            if (settings.richTextEditor === true) {
                //
                s.push('.ql-editor blockquote, .ql-snow .ql-editor code, .ql-container > .ql-tooltip { background-color: #3b3b3d; color: #b2aca2; }');
                s.push('.ql-container > .ql-tooltip { margin-left: 10em; box-shadow: 0 0 5px black; }');
                s.push('.ql-container > .ql-tooltip a { color: #b2aca2; }');
            }
        }
        //
        if (page !== 2) {
            // articles and other pages
            if (settings.redesignPage === true) {
                // page redesign styling
                s.push('body { padding-top: 1em; border-top: 0; font-family: Roboto, Helvetica, sans-serif; }');
                s.push('#outer-wrap { max-width: 87em; padding: 0 1em; }');
                s.push('#contentleft { width: 68%; }');
                s.push('#contentright { width: 30.5%; }');
                s.push('#sidebar { padding-top: 7px; }');
                s.push('li.comment > ul.children { padding-left: 1.8em; margin-left: 0; border-left: 0.1em dashed #a2a2a2; }');
                s.push('li.comment > div.comment-body { box-shadow: inset 0 0 5px black; }');
                s.push('.commentlist li { font-size: 1em; }');
                s.push('.textwidget > p { display: inline-block; margin-bottom: 0; }');
                s.push('.textwidget > p + p { float: right; clear: both; }');
                s.push('.widget { margin-bottom: 1em; }');
                s.push('#text-3 > div { width: 100%; display: inline-block; }');
                s.push('#text-3 > div + div { }');
                s.push('#logo { text-align: center; }');
                s.push('div.followit--follow-form-container { margin: 0 auto 1em auto; padding: 10px 20px; }');
                s.push('div.followit--follow-form-container[attr-a][attr-b][attr-c][attr-d][attr-e][attr-f] > form > div.form-preview { margin-top: 0!important; }');
                s.push('div.followit--follow-form-container[attr-a][attr-b][attr-c][attr-d][attr-e][attr-f] .form-preview .preview-input-field input { height: 30px!important; }');
                s.push('div.followit--follow-form-container[attr-a][attr-b][attr-c][attr-d][attr-e][attr-f] .form-preview .preview-submit-button button { height: 30px!important; }');
                s.push('#searchform > #submitbutton { margin: 0 0.25em; }');
                //
                // bump up the IPFS banner
                document.getElementById('text-3').appendChild(document.getElementsByClassName('widget_text widget-wrap')[0]);
            }
            //
            if (page === 0) {
                // articles page
                if (settings.commentsSortOrder === true) {
                    // comments sort order
                    //s.push('.cr_ui_so_tb { float: right; clear: both; }');
                    //s.push('.cr_ui_so_tb span { box-shadow: 0px 0px 1px #888; background-color: #d5d5d5; border: 0.1em #d5d5d5 solid; padding: 0.25em 0.1em 0 0.1em; margin: 0 0.2em; user-select: none; cursor: default; color: #0000ff; border-radius: 0.2em; }');
                    //s.push('.cr_ui_so_tb span:hover { opacity: 0.8; border-color: #d0d0d0; }');
                    s.push('#wpadminbar > div > div > ul { margin-top: 0.45em; display: inline-block; }');
                    s.push('#wpadminbar > div > div > ul li { line-height: 1; box-shadow: 0px 0px 1px #888; background-color: #d5d5d5; border: 0.1em #d5d5d5 solid; padding: 0.2em; margin: 0 0.2em; user-select: none; cursor: default; color: black; border-radius: 0.2em; }');
                    s.push('#wpadminbar > div > div > ul li:hover { opacity: 0.8; border-color: #d0d0d0; }');
                    s.push('#wpadminbar > div > div { display: inline-block; vertical-align: top; }');
                    s.push('#wpadminbar > div > div > span { display: inline-block; margin: 0.6em 1em 0 2.5em; line-height: 1.2; vertical-align: top; font-weight: 700; }}');
                    s.push('#wpadminbar > div > div > ul li.btn-clicked-def { color: #181a1b; background-color: #d0d0d0; border-color: #181a1b; }');
                    s.push('.sce-comment-delete { float:none!important; }');
                    s.push('.send-email-button { width: 1em; display: block; float: right; }');
                    s.push('.send-email-button:hover { opacity: 0.8; }');
                }
                //
                if (settings.richTextEditor === true) {
                    // rich text editor styles
                    GM_addStyle(GM_getResourceText("QUILLCSS"));
                    //
                    s.push('.ql-container { max-height: 36em; overflow: auto; min-height: 18em; font-size: 1em; }');
                    s.push('.ql-editor { min-height: 18em; padding: 0.5em; }');
                    s.push('#comment { height: 0; opacity: 0; padding: 0; }');
                }
            }
        } else {
            // profile page
            s.push('.cr_ui_so_ss > div { padding: 0.5em 0 0.5em; margin: 1em 0; }');
            s.push('.cr_ui_so_ss > input { width: 15em; }');
            s.push('.cr_ui_so_ss div div { display: inline-block; width: 15.6em; font-size: 14px; font-weight: 600; }');
            s.push('.cr_ui_so_ss div div select { max-width: none; }');
            s.push('.cr_ui_so_ss div div + div { width: 50em; }');
        }
        //
        let style = document.createElement('style');
        style.textContent = s.join(' ');
        document.head.appendChild(style);
    }
    //
    //
    function getSettings() {
        class settingsClass {
            constructor() {
                this.path = 'CR_UI_SETTINGS';
                this.settings = {
                    commentsSortOrder: true,
                    commentsSortOrderDefault: 0,
                    subscriptionSetting: 0,
                    richTextEditor: true,
                    autoSaveComments: false,
                    redesignPage: false,
                    darkMode: false,
                    fontSize: 0,
                    trackLastRead: false
                };
                //
                let settings = GM_getValue(this.path, null);
                if (settings !== null) { this.settings = JSON.parse(settings);}
            }
            //
            save() {
                GM_setValue(this.path, JSON.stringify(this.settings));
            }
        }
        //
        return new settingsClass();
    }
    //
    //
    function getUnread() {
        class unreadClass {
            constructor() {
                this.path = 'CR_UI_UNREAD';
                this.unread = {
                    //"article_path": last_read_comment_id
                };
                //
                //GM_deleteValue(this.path);
                let unread = GM_getValue(this.path, null);
                if (unread !== null) { this.unread = JSON.parse(unread);}
            }
            //
            get(path, id) {
                let last_read = this.unread[path];
                if (last_read === id) { return -1; }
                //
                this.unread[path] = id;
                this.save();
                //
                return last_read | 0;
            }
            //
            save() {
                GM_setValue(this.path, JSON.stringify(this.unread));
            }
        };
        //
        return new unreadClass();
    }
    //
    // add a button for external site search, opens in a new tab
    function addCommentSearch() {
        let s = document.getElementById('searchform');
        let b = document.createElement('input');
        b.type = 'button';
        b.value = 'Site search';
        b.title = 'Search for site content on an external search engine in a new tab';
        //
        b.addEventListener('click', () => {
            window.open(encodeURI(SEARCH_ENGINE + 'site:corbettreport.com ' + document.getElementById('searchfield').value), '_blank');
        }, false);
        //
        s.appendChild(b);
    }
})();
