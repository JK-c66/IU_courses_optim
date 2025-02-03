// ==UserScript==
// @name         IU Available Courses Grabber
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  A script to get the information of classes on IU system
// @author       You
// @include https://eduportal.iu.edu.sa/iu/ui/student/homeIndex.faces
// @include https://eduportal.iu.edu.sa/iu/ui/student/*/*/*
// @include http://eduportal.iu.edu.sa/iu/ui/student/*
// @include https://eduportal.iu.edu.sa/iu/ui/student/student_schedule/index/studentScheduleIndex.faces
// @icon         https://www.google.com/s2/favicons?sz=64&domain=edu.sa
// @require            https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant              GM_getValue
// @grant              GM_setValue
// @license Mozilla Public License 2.0
// @downloadURL https://update.greasyfork.org/scripts/461624/IU%20Available%20Courses%20Grabber.user.js
// @updateURL https://update.greasyfork.org/scripts/461624/IU%20Available%20Courses%20Grabber.meta.js
// ==/UserScript==
/* globals $, GM_config */

(function() {
    'use strict';
    var rows = document.getElementById("myForm:offeredCoursesTable").getElementsByTagName("tbody")[0];
    var sections = [];
    for (var course of rows.getElementsByTagName("tr")) {
        var section_items = course.children;
        var section_course = section_items.item(1).innerText;
        var section_number = section_items.item(2).innerText;
        var section_type = section_items.item(3).innerText; // "نظري او عملي"
        var section_credit = section_items.item(4).innerText;
        var section_availability = section_items.item(5).firstChild.innerText; // "مفتوحة او مغلقة"
        var section_details = section_items.item(6).firstChild.children; // inside an anchor element
        var section_instructor = section_details.item(0).value;
        var section_times = section_details.item(1).value;
        var section = {section_number:section_number, section_course:section_course, section_type:section_type, section_credit:section_credit,
                       section_availability:section_availability, section_times:section_times, section_instructor:section_instructor}
        sections.push(section);
    }
    const string = JSON.stringify(sections);

    // Create UI container
    const container = document.createElement('div');
    container.id = 'course-data-panel';
    container.dir = 'rtl'; // Set RTL direction

    // Create styles
    const styles = document.createElement('style');
    styles.textContent = `
        #course-data-panel {
            position: fixed;
            bottom: 40px;
            right: 40px;
            background: #fff;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            padding: clamp(10px, 3vw, 20px);
            font-family: 'Cairo', sans-serif;
            z-index: 10000;
            direction: rtl;
            max-width: 90vw;
            width: max-content;
        }

        #course-data-panel textarea {
            width: clamp(250px, 80vw, 400px);
            height: clamp(120px, 30vh, 200px);
            margin-bottom: 15px;
            padding: 10px;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            resize: both;
            direction: rtl;
            font-family: 'Cairo', sans-serif;
            font-size: 14px;
        }

        #course-data-panel .button-container {
            display: flex;
            gap: 10px;
            justify-content: flex-start;
            flex-wrap: wrap;
        }

        #course-data-panel button {
            padding: clamp(6px, 2vw, 8px) clamp(12px, 3vw, 16px);
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-family: 'Cairo', sans-serif;
            font-weight: bold;
            transition: all 0.3s ease;
            font-size: clamp(14px, 2vw, 16px);
            flex: 1;
            min-width: 80px;
            max-width: 150px;
        }

        #copy-btn {
            background-color: #2196F3;
            color: white;
        }

        #download-btn {
            background-color: #4CAF50;
            color: white;
        }

        #optimize-btn {
            background-color: #9C27B0;
            color: white;
        }

        #course-data-panel button:hover {
            opacity: 0.9;
            transform: translateY(-1px);
        }

        #course-data-panel button:active {
            transform: translateY(1px);
        }

        .success-animation {
            animation: fadeInOut 1.5s ease;
        }

        @keyframes fadeInOut {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        @media (max-width: 480px) {
            #course-data-panel {
                bottom: 20px;
                right: 20px;
                padding: 10px;
            }

            #course-data-panel textarea {
                width: calc(90vw - 40px);
                height: 120px;
                margin-bottom: 10px;
            }

            #course-data-panel .button-container {
                justify-content: stretch;
            }

            #course-data-panel button {
                flex: 1 1 100%;
                max-width: none;
            }
        }
    `;
    document.head.appendChild(styles);

    // Create textarea for data
    const textarea = document.createElement('textarea');
    textarea.value = string;
    textarea.readOnly = true;

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';

    // Create copy button
    const copyBtn = document.createElement('button');
    copyBtn.id = 'copy-btn';
    copyBtn.textContent = 'نسخ';
    copyBtn.onclick = async () => {
        try {
            await navigator.clipboard.writeText(string);
            copyBtn.textContent = 'تم النسخ!';
            copyBtn.classList.add('success-animation');
            setTimeout(() => {
                copyBtn.textContent = 'نسخ';
                copyBtn.classList.remove('success-animation');
            }, 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Create download button
    const downloadBtn = document.createElement('button');
    downloadBtn.id = 'download-btn';
    downloadBtn.textContent = 'تحميل';
    downloadBtn.onclick = () => {
        const blob = new Blob([string], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'courses_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        downloadBtn.textContent = 'تم التحميل!';
        downloadBtn.classList.add('success-animation');
        setTimeout(() => {
            downloadBtn.textContent = 'تحميل';
            downloadBtn.classList.remove('success-animation');
        }, 1500);
    };

    // Create optimize button
    const optimizeBtn = document.createElement('button');
    optimizeBtn.id = 'optimize-btn';
    optimizeBtn.textContent = 'فتح الموقع';
    optimizeBtn.style.backgroundColor = '#9C27B0'; 
    optimizeBtn.style.color = 'white';
    optimizeBtn.onclick = async () => {
        try {
            await navigator.clipboard.writeText(string);
            optimizeBtn.textContent = 'تم النسخ!';
            optimizeBtn.classList.add('success-animation');
            window.open('https://JKc66.github.io/IU_courses_optim/index.html', '_blank');
            setTimeout(() => {
                optimizeBtn.textContent = 'فتح الموقع';
                optimizeBtn.classList.remove('success-animation');
            }, 1500);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    // Assemble the UI
    buttonContainer.appendChild(copyBtn);
    buttonContainer.appendChild(downloadBtn);
    buttonContainer.appendChild(optimizeBtn);
    container.appendChild(textarea);
    container.appendChild(buttonContainer);
    document.body.appendChild(container);
})();