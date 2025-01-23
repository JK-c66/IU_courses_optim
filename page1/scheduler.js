// Global state
let coursesData = [];
let selectedCourses = new Set();
let selectedDoctors = new Map(); // course -> selected doctor
let currentScheduleIndex = 0; // Track which schedule is being displayed
let currentResult = null; // Store current schedule result
let courseColors = new Map();
let includeClosedSections = true; // Changed to true by default

// Add schedule limit constant
const SCHEDULE_LIMIT = 10;

// Add new conflict tracking functionality
let scheduleConflicts = [];

// DOM Elements
const availableCoursesEl = document.getElementById('availableCourses');
const doctorPreferencesEl = document.getElementById('doctorPreferences');
const optimizeBtn = document.getElementById('optimizeBtn');
const scheduleResultEl = document.getElementById('scheduleResult');
const jsonInput = document.getElementById('jsonInput');
const parseTextBtn = document.getElementById('parseTextBtn');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const goToViewerBtn = document.getElementById('goToViewer');

goToViewerBtn.addEventListener('click', () => {
    window.location.href = '../index.html';
});

// Validate DOM elements
function validateDOMElements() {
    const elements = {
        availableCourses: availableCoursesEl,
        doctorPreferences: doctorPreferencesEl,
        optimizeBtn: optimizeBtn,
        scheduleResult: scheduleResultEl,
        jsonInput: jsonInput,
        parseTextBtn: parseTextBtn,
        dropZone: dropZone,
        fileInput: fileInput,
        fileName: fileName,
        goToViewer: goToViewerBtn
    };

    for (const [name, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Missing DOM element: ${name}`);
        }
    }
}

// Input handling functions
function setupInputHandlers() {
    // Text input handling
    parseTextBtn.addEventListener('click', () => {
        const jsonText = jsonInput.value.trim();
        if (!jsonText) {
            alert('Please enter JSON data');
            return;
        }
        processInputData(jsonText);
    });

    // File drop handling
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });

    // File input handling
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleFileUpload(file);
        }
    });
}

function resetFileInput() {
    fileInput.value = '';
    fileName.textContent = 'No file chosen';
}

function handleFileUpload(file) {
    if (file.type !== 'application/json') {
        alert('Please upload a JSON file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        processInputData(e.target.result);
        fileName.textContent = file.name;
    };
    reader.readAsText(file);
}

function processInputData(jsonText) {
    try {
        // Validate JSON format
        if (!isValidJSON(jsonText)) {
            alert('Invalid JSON format');
            return;
        }

        const data = JSON.parse(jsonText);
        
        // Validate data structure
        if (!isValidCourseData(data)) {
            alert('Invalid course data structure');
            return;
        }

        // Store the data
        coursesData = data;
        
        // Update UI
        const dataConfirmation = document.getElementById('dataConfirmation');
        const dataTimestamp = document.getElementById('dataTimestamp');
        if (dataConfirmation && dataTimestamp) {
            dataTimestamp.textContent = new Date().toLocaleString();
            dataConfirmation.style.display = 'block';
        }

        // Reset selections
        selectedCourses.clear();
        selectedDoctors.clear();
        
        // Refresh the course list
        renderAvailableCourses();

    } catch (error) {
        console.error('Error processing input data:', error);
        alert('Error processing input data. Please check the format and try again.');
    }
}

// Initialize the page
function initializeScheduler() {
    try {
        validateDOMElements();
        
        // Add closed sections toggle to the page
        const optimizationSection = document.querySelector('.optimization-preferences');
        if (optimizationSection) {
            const closedSectionsToggleHTML = `
                <div class="closed-sections-toggle" style="
                    margin: 20px 0;
                    padding: 15px;
                    background: var(--bg-secondary);
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                ">
                    <label class="toggle-container" style="
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 10px;
                        cursor: pointer;
                    ">
                        <span style="color: var(--text-color);">حساب الشعب المغلقة</span>
                        <input type="checkbox" id="closedSectionsToggle" checked style="
                            width: 20px;
                            height: 20px;
                            cursor: pointer;
                        ">
                    </label>
                </div>
            `;
            optimizationSection.insertAdjacentHTML('afterbegin', closedSectionsToggleHTML);
        }
        
        // Setup all event listeners
        setupEventListeners();
        setupInputHandlers();
        
        // Clear any existing content in scheduleResultEl
        if (scheduleResultEl) {
            scheduleResultEl.innerHTML = '';
        }
    } catch (error) {
        console.error('Error initializing scheduler:', error);
    }
}

// Helper function to validate JSON
function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

// Helper function to validate course data structure
function isValidCourseData(data) {
    if (!Array.isArray(data)) return false;
    return data.every(course => 
        course.hasOwnProperty('section_course') &&
        course.hasOwnProperty('section_instructor') &&
        course.hasOwnProperty('section_type') &&
        course.hasOwnProperty('section_times')
    );
}

// Helper function to redirect to input page
function redirectToInput(message) {
    alert(message);
    window.location.href = 'index.html';
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeScheduler);

// Render the list of available courses
function renderAvailableCourses() {
    const uniqueCourses = new Set(coursesData.map(course => course.section_course));
    availableCoursesEl.innerHTML = Array.from(uniqueCourses)
        .map(course => {
            const hasLab = coursesData.some(section => 
                section.section_course === course && 
                section.section_type === 'عملي'
            );
            const hasClosed = coursesData.some(section =>
                section.section_course === course &&
                section.section_availability === 'مغلقة'
            );
            return `
                <div class="course-item ${hasClosed ? 'has-closed' : ''}" 
                    data-course="${course}" 
                    style="--lab-display: ${hasLab ? 'inline-block' : 'none'}"
                >
                    <h3>${course}</h3>
                    ${hasClosed ? '<span class="closed-indicator">مغلقة</span>' : ''}
                </div>
            `;
        }).join('');
}

// Setup event listeners
function setupEventListeners() {
    // Course selection
    availableCoursesEl.addEventListener('click', (e) => {
        const courseItem = e.target.closest('.course-item');
        if (!courseItem) return;

        // Check if course is closed and toggle is off
        const isClosed = courseItem.querySelector('.closed-indicator');
        const isClosedEnabled = document.getElementById('closedSectionsToggle')?.checked ?? true;
        
        if (isClosed && !isClosedEnabled) {
            // Don't allow selection of closed courses when toggle is off
            return;
        }

        const courseName = courseItem.dataset.course;
        if (selectedCourses.has(courseName)) {
            selectedCourses.delete(courseName);
            courseItem.classList.remove('selected');
        } else {
            selectedCourses.add(courseName);
            courseItem.classList.add('selected');
        }
    });

    // Optimization preference
    document.querySelectorAll('input[name="optimization-preference"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            // Remove selected state from all options
            document.querySelectorAll('.preference-option').forEach(option => {
                option.classList.remove('selected');
            });
            
            // Add selected state to parent
            const selectedOption = e.target.closest('.preference-option');
            if (selectedOption) {
                selectedOption.classList.add('selected');
            }

            // Show/hide doctor preferences
            if (e.target.value === 'specific-doctors') {
                showDoctorPreferences();
            } else {
                doctorPreferencesEl.style.display = 'none';
            }
        });
    });

    // Update closed sections toggle
    const closedSectionsToggle = document.getElementById('closedSectionsToggle');
    if (closedSectionsToggle) {
        closedSectionsToggle.addEventListener('change', (e) => {
            includeClosedSections = e.target.checked;
            // Update UI to show/hide closed sections
            document.querySelectorAll('.course-item').forEach(item => {
                const courseName = item.dataset.course;
                const hasClosed = coursesData.some(section => 
                    section.section_course === courseName && 
                    section.section_availability === 'مغلقة'
                );
                if (hasClosed) {
                    item.classList.toggle('has-closed', includeClosedSections);
                    // If toggle is turned off and this course was selected, deselect it
                    if (!includeClosedSections && selectedCourses.has(courseName)) {
                        selectedCourses.delete(courseName);
                        item.classList.remove('selected');
                    }
                }
            });
        });
    }

    // Optimize button
    optimizeBtn.addEventListener('click', generateSchedule);
}

// Show doctor preferences when that option is selected
function showDoctorPreferences() {
    if (selectedCourses.size === 0) {
        alert('Please select courses first');
        const radioBtn = document.querySelector('input[value="specific-doctors"]');
        if (radioBtn) {
            radioBtn.checked = false;
            radioBtn.closest('.preference-option').classList.remove('selected');
        }
        return;
    }

    const doctorOptions = Array.from(selectedCourses).map(course => {
        const sections = coursesData.filter(section => section.section_course === course);
        const lectureDoctors = new Set(sections
            .filter(section => section.section_type !== 'عملي')
            .map(section => section.section_instructor));
        const labDoctors = new Set(sections
            .filter(section => section.section_type === 'عملي')
            .map(section => section.section_instructor));

        // Only show selection if there are multiple doctors
        const hasMultipleLecturers = lectureDoctors.size > 1;
        const hasMultipleLabs = labDoctors.size > 1;

        // If no multiple options, don't show anything
        if (!hasMultipleLecturers && !hasMultipleLabs) {
            return '';
        }

        return `
            <div class="course-doctors">
                <h3>${course}</h3>
                <div class="select-groups">
                    ${hasMultipleLecturers ? `
                        <div class="select-wrapper">
                            <label class="select-label">
                                <span class="section-type lecture">محاضرة</span>
                                محاضر المادة
                            </label>
                            <select data-course="${course}" data-type="lecture" class="doctor-select">
                                <option value="">Any Doctor</option>
                                ${Array.from(lectureDoctors).map(doctor => 
                                    `<option value="${doctor}">${doctor}</option>`
                                ).join('')}
                            </select>
                        </div>
                    ` : ''}
                    ${hasMultipleLabs ? `
                        <div class="select-wrapper">
                            <label class="select-label">
                                <span class="section-type lab">معمل</span>
                                محاضر المعمل
                            </label>
                            <select data-course="${course}" data-type="lab" class="doctor-select">
                                <option value="">Any Doctor</option>
                                ${Array.from(labDoctors).map(doctor => 
                                    `<option value="${doctor}">${doctor}</option>`
                                ).join('')}
                            </select>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).filter(Boolean); // Remove empty strings

    // Only show the preferences section if there are courses with multiple doctors
    if (doctorOptions.length === 0) {
        doctorPreferencesEl.innerHTML = `
            <div style="padding: 15px; text-align: center; color: var(--text-color);">
                لا يوجد خيارات متعددة للمحاضرين في المواد المختارة
            </div>
        `;
    } else {    
        doctorPreferencesEl.innerHTML = `
            <h2>3. choose the preferred doctors</h2>
            ${doctorOptions.join('')}
        `;
    }

    // Slide down animation
    doctorPreferencesEl.style.display = 'block';
    doctorPreferencesEl.style.opacity = '0';
    doctorPreferencesEl.style.transform = 'translateY(-20px)';
    doctorPreferencesEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    // Trigger animation
    setTimeout(() => {
        doctorPreferencesEl.style.opacity = '1';
        doctorPreferencesEl.style.transform = 'translateY(0)';
    }, 10);

    // Setup doctor selection listeners
    doctorPreferencesEl.querySelectorAll('select').forEach(select => {
        select.addEventListener('change', (e) => {
            const course = e.target.dataset.course;
            const type = e.target.dataset.type;
            const doctor = e.target.value;
            
            // Initialize the course object if it doesn't exist
            if (!selectedDoctors.has(course)) {
                selectedDoctors.set(course, {});
            }
            
            const coursePrefs = selectedDoctors.get(course);
            if (doctor) {
                coursePrefs[type] = doctor;
            } else {
                delete coursePrefs[type];
            }
            
            // Remove the course entry if no preferences are set
            if (Object.keys(coursePrefs).length === 0) {
                selectedDoctors.delete(course);
            }
        });
    });
}

// Add loading indicator functions
function showLoadingIndicator() {
    const loadingHTML = `
        <div id="loadingContainer" style="
            position: relative;
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 30px;
            margin: 20px auto;
            text-align: center;
            max-width: 600px;
            border: 1px solid var(--border-color);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        ">
            <div class="spinner" style="
                width: 50px;
                height: 50px;
                border: 5px solid var(--border-color);
                border-top: 5px solid var(--accent-color);
                border-radius: 50%;
                margin: 0 auto 20px;
                animation: spin 1s linear infinite;
            "></div>
            
            <div id="loadingStage" style="
                color: var(--text-color);
                margin-bottom: 15px;
                font-size: 1.1em;
                font-weight: 500;
            ">جاري تحليل المواد المختارة...</div>
            
            <div class="progress-container" style="
                background: var(--bg-color);
                border-radius: 10px;
                height: 10px;
                overflow: hidden;
                margin: 15px 0;
                border: 1px solid var(--border-color);
            ">
                <div id="progressBar" style="
                    width: 0%;
                    height: 100%;
                    background: var(--accent-color);
                    transition: width 0.3s ease;
                "></div>
            </div>
            
            <div id="progressText" style="
                color: var(--text-color);
                font-size: 0.9em;
                opacity: 0.8;
            ">0%</div>
        </div>
        
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    `;
    
    scheduleResultEl.innerHTML = loadingHTML;
}

function updateLoadingProgress(stage, progress) {
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const loadingStage = document.getElementById('loadingStage');
    
    if (progressBar && progressText && loadingStage) {
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
        loadingStage.textContent = stage;
    }
}

// Update generateSchedule function to include loading states
async function generateSchedule() {
    if (selectedCourses.size === 0) {
        alert('Please select at least one course');
        return;
    }

    // Reset conflicts array and show loading indicator
    scheduleConflicts = [];
    showLoadingIndicator();

    const optimizationType = document.querySelector('input[name="optimization-preference"]:checked')?.value;
    if (!optimizationType) {
        alert('Please select an optimization preference');
        return;
    }

    try {
        // Initial validation - 10%
        updateLoadingProgress('جاري التحقق من المواد المختارة...', 10);
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for visual feedback

        // Get valid sections - 30%
        updateLoadingProgress('جاري تحليل الشعب المتاحة...', 30);
        const validSections = coursesData.filter(section => {
            if (!includeClosedSections && section.section_availability === 'مغلقة') {
                return false;
            }
            
            if (!selectedCourses.has(section.section_course)) return false;
            if (selectedDoctors.has(section.section_course)) {
                const prefs = selectedDoctors.get(section.section_course);
                if (section.section_type === 'عملي' && prefs.lab) {
                    return section.section_instructor === prefs.lab;
                } else if (section.section_type !== 'عملي' && prefs.lecture) {
                    return section.section_instructor === prefs.lecture;
                }
            }
            return true;
        });
        await new Promise(resolve => setTimeout(resolve, 500));

        // Group sections - 50%
        updateLoadingProgress('جاري تجميع الشعب...', 50);
        const courseGroups = {};
        for (const section of validSections) {
            if (!courseGroups[section.section_course]) {
                courseGroups[section.section_course] = {
                    lectures: [],
                    labs: []
                };
            }
            if (section.section_type === 'عملي') {
                courseGroups[section.section_course].labs.push(section);
            } else {
                courseGroups[section.section_course].lectures.push(section);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 500));

        // Generate combinations - 70%
        updateLoadingProgress('جاري إنشاء الجداول الممكنة...', 70);
        const combinations = generateCombinations(courseGroups);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Find best schedule - 90%
        updateLoadingProgress('جاري تحديد أفضل الجداول...', 90);
        currentResult = findBestSchedule(combinations, optimizationType);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Render results - 100%
        updateLoadingProgress('جاري عرض النتائج...', 100);
        await new Promise(resolve => setTimeout(resolve, 300));

        // Show final results
        currentScheduleIndex = 0;
        renderScheduleWithOptions(currentResult);

    } catch (error) {
        console.error('Error generating schedule:', error);
        scheduleResultEl.innerHTML = `
            <div style="
                background: var(--bg-secondary);
                border-radius: 12px;
                padding: 20px;
                margin: 20px auto;
                text-align: center;
                max-width: 600px;
                color: var(--text-color);
                border: 1px solid var(--border-color);
            ">
                <div style="color: #ff4444; margin-bottom: 10px;">⚠️ حدث خطأ أثناء إنشاء الجدول</div>
                <div>يرجى المحاولة مرة أخرى أو تحديث الصفحة</div>
            </div>
        `;
    }
}

// Helper function to parse time slots from the time string
function parseTimeSlots(timeString) {
    if (!timeString || timeString.trim() === '') {
        return []; // Return empty array for empty time strings (valid for some courses)
    }
    
    const slots = [];
    const parts = timeString.split('@n');
    
    // First, collect all individual slots
    const rawSlots = [];
    for (const part of parts) {
        // Extract all days (handling multiple days in one slot)
        const daysStr = part.split('@t')[0].trim();
        const days = daysStr.split(' ').map(d => parseInt(d)).filter(d => !isNaN(d));
        
        if (days.length === 0) continue;
        
        const timeMatch = part.match(/@t\s*([^\s@]+)\s*([صم])\s*-\s*([^\s@]+)\s*([صم])/);
        if (!timeMatch) continue;
        
        const [_, startTime, startPeriod, endTime, endPeriod] = timeMatch;
        
        // Convert times to minutes
        const start = convertTimeToMinutes(`${startTime} ${startPeriod}`);
        const end = convertTimeToMinutes(`${endTime} ${endPeriod}`);
        
        // Validate times
        if (isNaN(start) || isNaN(end) || start >= end) {
            console.error('Invalid time range:', startTime, startPeriod, '-', endTime, endPeriod);
            continue;
        }
        
        // Create a slot for each day
        for (const day of days) {
            if (day >= 1 && day <= 5) {
                rawSlots.push({
                    day: day,
                    start: start,
                    end: end
                });
            }
        }
    }
    
    // Sort slots by day and start time
    rawSlots.sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.start - b.start;
    });
    
    // Merge consecutive slots
    let currentSlot = null;
    for (const slot of rawSlots) {
        if (!currentSlot) {
            currentSlot = {...slot};
            continue;
        }
        
        // If same day and either consecutive or overlapping times
        if (currentSlot.day === slot.day && 
            (slot.start <= currentSlot.end + 10 || // Allow 10 minutes gap
             (slot.start >= currentSlot.start && slot.end <= currentSlot.end))) { // Overlapping
            currentSlot.end = Math.max(currentSlot.end, slot.end);
        } else {
            slots.push(currentSlot);
            currentSlot = {...slot};
        }
    }
    if (currentSlot) {
        slots.push(currentSlot);
    }
    
    return slots;
}

// Helper function to convert time string to minutes
function convertTimeToMinutes(timeStr) {
    const [time, period] = timeStr.trim().split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) return NaN;
    
    let totalMinutes = hours * 60 + minutes;
    if (period === 'م' && hours !== 12) {
        totalMinutes += 12 * 60;
    }
    if (period === 'ص' && hours === 12) {
        totalMinutes -= 12 * 60;
    }
    
    return totalMinutes;
}

// Helper function to generate all possible combinations of sections
function generateCombinations(courseGroups) {
    const combinations = [[]];
    
    for (const [course, sections] of Object.entries(courseGroups)) {
        const currentCombinations = [];
        for (const combination of combinations) {
            // Get doctor preferences for this course
            const coursePrefs = selectedDoctors.get(course) || {};
            
            // Filter lectures based on preferences
            const validLectures = sections.lectures.filter(lecture => {
                if (!lecture.section_times) return false;
                if (coursePrefs.lecture) {
                    return lecture.section_instructor === coursePrefs.lecture;
                }
                return true;
            });

            // Add lecture sections
            for (const lecture of validLectures) {
                if (sections.labs.length > 0) {
                    // Filter labs based on preferences
                    const validLabs = sections.labs.filter(lab => {
                        if (!lab.section_times) return false;
                        if (coursePrefs.lab) {
                            return lab.section_instructor === coursePrefs.lab;
                        }
                        return true;
                    });

                    // Add each valid lecture-lab pair
                    for (const lab of validLabs) {
                        const newCombination = [...combination, lecture, lab];
                        if (!hasTimeConflict(newCombination)) {
                            currentCombinations.push(newCombination);
                        }
                    }
                } else {
                    // Course doesn't have labs, just add the lecture
                    const newCombination = [...combination, lecture];
                    if (!hasTimeConflict(newCombination)) {
                        currentCombinations.push(newCombination);
                    }
                }
            }
        }
        combinations.length = 0;
        combinations.push(...currentCombinations);
    }
    
    return combinations;
}

// Helper function to check for time conflicts and track them
function hasTimeConflict(sections) {
    let conflicts = [];
    for (let i = 0; i < sections.length; i++) {
        for (let j = i + 1; j < sections.length; j++) {
            if (sectionsOverlap(sections[i], sections[j])) {
                conflicts.push({
                    course1: sections[i],
                    course2: sections[j],
                    times1: parseTimeSlots(sections[i].section_times),
                    times2: parseTimeSlots(sections[j].section_times)
                });
            }
        }
    }
    if (conflicts.length > 0) {
        scheduleConflicts.push(...conflicts);
    }
    return conflicts.length > 0;
}

// Helper function to check if two sections overlap in time
function sectionsOverlap(section1, section2) {
    const times1 = parseTimeSlots(section1.section_times);
    const times2 = parseTimeSlots(section2.section_times);

    for (const time1 of times1) {
        for (const time2 of times2) {
            if (time1.day === time2.day) {
                if (!(time1.end <= time2.start || time1.start >= time2.end)) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Find the best schedule based on optimization type
function findBestSchedule(combinations, optimizationType) {
    if (combinations.length === 0) {
        return { 
            schedules: [], 
            message: 'لم يتم العثور على جداول تلبي المتطلبات' 
        };
    }
    
    let result;
    switch (optimizationType) {
        case 'max-days-off':
            result = findSchedulesWithMostDaysOff(combinations);
            break;
        case 'thursday-off':
            result = findSchedulesWithThursdayOff(combinations);
            break;
        case 'specific-doctors':
            result = {
                schedules: combinations.slice(0, SCHEDULE_LIMIT),
                message: `تم العثور على ${combinations.length > SCHEDULE_LIMIT ? SCHEDULE_LIMIT + ' من أصل ' + combinations.length : combinations.length} جدول دراسي`
            };
            break;
        default:
            result = {
                schedules: [combinations[0]],
                message: 'تم العثور على جدول دراسي واحد'
            };
    }
    
    return result;
}

// Helper function to get the correct Arabic form for "day"
function getArabicDayForm(number) {
    if (number === 2) {
        return 'يومين فراغ';
    } else if (number === 1 || number === 0) {
        return 'يوم فراغ';
    } else {
        return 'أيام فراغ';
    }
}

// Find schedules with most days off
function findSchedulesWithMostDaysOff(combinations) {
    let maxDaysOff = -1;
    let bestSchedules = [];
    
    for (const schedule of combinations) {
        const usedDays = new Set();
        let hasInvalidTimes = false;

        for (const section of schedule) {
            const slots = parseTimeSlots(section.section_times);
            if (slots.length === 0) {
                console.error('Invalid time format found:', section.section_times);
                hasInvalidTimes = true;
                break;
            }
            slots.forEach(slot => usedDays.add(slot.day));
        }

        if (hasInvalidTimes) continue;
        
        const daysOff = 5 - usedDays.size;
        
        if (daysOff < 0 || daysOff > 5) {
            console.error('Invalid days off calculation:', daysOff, 'for schedule:', schedule);
            continue;
        }
        
        if (daysOff > maxDaysOff) {
            maxDaysOff = daysOff;
            bestSchedules = [schedule];
        } else if (daysOff === maxDaysOff && bestSchedules.length < SCHEDULE_LIMIT) {
            bestSchedules.push(schedule);
        }
    }
    
    if (bestSchedules.length === 0) {
        return {
            schedules: [],
            message: 'لم يتم العثور على جداول صالحة - قد تكون هناك مشكلة في تنسيق البيانات'
        };
    }
    
    const totalFound = combinations.filter(schedule => {
        const usedDays = new Set();
        schedule.forEach(section => {
            parseTimeSlots(section.section_times).forEach(slot => usedDays.add(slot.day));
        });
        return (5 - usedDays.size) === maxDaysOff;
    }).length;
    
    return {
        schedules: bestSchedules.slice(0, SCHEDULE_LIMIT),
        message: `<span dir="rtl">تم العثور على ${totalFound > SCHEDULE_LIMIT ? SCHEDULE_LIMIT + ' من أصل ' + totalFound : totalFound} جدول دراسي مع ${maxDaysOff} ${getArabicDayForm(maxDaysOff)}</span>`
    };
}

// Find schedules with Thursday off
function findSchedulesWithThursdayOff(combinations) {
    const thursdayOffSchedules = combinations.filter(schedule => {
        for (const section of schedule) {
            const slots = parseTimeSlots(section.section_times);
            if (slots.some(slot => slot.day === 5)) { // 5 is Thursday
                return false;
            }
        }
        return true;
    }).slice(0, SCHEDULE_LIMIT);

    const totalThursdayOff = combinations.filter(schedule => {
        return !schedule.some(section => 
            parseTimeSlots(section.section_times).some(slot => slot.day === 5)
        );
    }).length;

    return {
        schedules: thursdayOffSchedules,
        message: `<span dir="rtl">تم العثور على ${totalThursdayOff > SCHEDULE_LIMIT ? SCHEDULE_LIMIT + ' من أصل ' + totalThursdayOff : totalThursdayOff} جدول دراسي مع يوم الخميس فارغ</span>`
    };
}

// Helper function to format time for display
function formatTimeForDisplay(minutes, period = null) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const displayHours = hours > 12 ? hours - 12 : hours;
    const periodText = period || (hours >= 12 ? 'م' : 'ص');
    return `${displayHours}:${String(mins).padStart(2, '0')} ${periodText}`;
}

// Update generateScheduleOverview to use the new time formatting
function generateScheduleOverview(schedules) {
    // Track variations for each course
    const courseVariations = new Map();
    
    // Initialize course variations tracking
    schedules[0].forEach(section => {
        courseVariations.set(section.section_course, {
            instructors: new Set(),
            timeSlots: new Set(),
            days: new Set(),
            variations: []
        });
    });
    
    // Analyze all schedules
    schedules.forEach((schedule, scheduleIndex) => {
        schedule.forEach(section => {
            const course = section.section_course;
            const variations = courseVariations.get(course);
            
            variations.instructors.add(section.section_instructor);
            
            const slots = parseTimeSlots(section.section_times);
            slots.forEach(slot => {
                variations.days.add(slot.day);
                const timeStr = `${Math.floor(slot.start/60)}:${String(slot.start%60).padStart(2,'0')} - ${Math.floor(slot.end/60)}:${String(slot.end%60).padStart(2,'0')}`;
                variations.timeSlots.add(`${['', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'][slot.day]} ${timeStr}`);
            });
            
            const variationKey = JSON.stringify({
                instructor: section.section_instructor,
                times: section.section_times
            });
            if (!variations.variations.some(v => v.key === variationKey)) {
                variations.variations.push({
                    key: variationKey,
                    instructor: section.section_instructor,
                    times: section.section_times,
                    scheduleIndices: [scheduleIndex + 1]
                });
            } else {
                variations.variations.find(v => v.key === variationKey)
                    .scheduleIndices.push(scheduleIndex + 1);
            }
        });
    });
    
    // Generate modern card-based HTML for the overview
    let overviewHTML = `
        <div class="schedule-overview" style="
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            font-family: system-ui, -apple-system, sans-serif;
            direction: rtl;
        ">
        <h3 style="
            color: var(--text-color);
            margin-bottom: 20px;
            font-size: 1.5em;
            border-bottom: 2px solid var(--border-color);
            padding-bottom: 10px;
            text-align: right;
        ">تحليل الجداول (${schedules.length} خيار)</h3>
    `;
    
    // Sort courses by number of variations
    const sortedCourses = Array.from(courseVariations.entries())
        .sort((a, b) => b[1].variations.length - a[1].variations.length);
    
    for (const [course, data] of sortedCourses) {
        const courseColor = generateCourseColor(course);
        
        // Skip courses with no variations
        const hasVariations = data.variations.some(v => 
            (v.scheduleIndices.length / schedules.length * 100) < 100
        );
        if (!hasVariations) continue;
        
        overviewHTML += `
            <div class="course-card" style="
                background: var(--bg-secondary);
                border-radius: 12px;
                margin-bottom: 20px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            ">
                <div class="course-header" style="
                    background: ${courseColor};
                    padding: 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    color: white;
                ">
                    <h4 style="margin: 0; font-size: 1.2em;">${course}</h4>
                    <span class="variation-count" style="
                        background: rgba(255,255,255,0.2);
                        padding: 4px 8px;
                        border-radius: 12px;
                        font-size: 0.9em;
                    ">${data.variations.filter(v => (v.scheduleIndices.length / schedules.length * 100) < 100).length} خيارات</span>
                </div>
                
                <div class="course-content" style="padding: 15px;">
                    <div class="instructor-list" style="
                        margin-bottom: 10px;
                        display: flex;
                        flex-wrap: wrap;
                        gap: 8px;
                    ">
                        ${Array.from(data.instructors).map(instructor => `
                            <span class="instructor-tag" style="
                                background: var(--bg-color);
                                padding: 4px 12px;
                                border-radius: 15px;
                                font-size: 0.9em;
                                color: var(--text-color);
                            ">${instructor}</span>
                        `).join('')}
                    </div>
                    
                    <div class="variations-grid" style="
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 15px;
                        margin-top: 15px;
                    ">
                        ${data.variations
                            .map((variation, index) => {
                                const scheduleCount = variation.scheduleIndices.length;
                                const schedulePercentage = (scheduleCount / schedules.length * 100).toFixed(0);
                                
                                // Skip 100% variations
                                if (schedulePercentage >= 100) return '';
                                
                                const slots = parseTimeSlots(variation.times);
                                const timeBlocks = slots.map(slot => {
                                    const days = ['', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
                                    const startTime = formatTimeForDisplay(slot.start);
                                    const endTime = formatTimeForDisplay(slot.end);
                                    
                                    return `
                                        <div class="time-block" style="
                                            background: ${courseColor}CC;
                                            border-right: 3px solid ${courseColor};
                                            padding: 8px 12px;
                                            margin: 4px 0;
                                            border-radius: 6px;
                                            display: flex;
                                            justify-content: space-between;
                                            align-items: center;
                                        ">
                                            <span style="font-weight: bold;">${days[slot.day]}</span>
                                            <span style="
                                                background: ${courseColor}E6;
                                                padding: 2px 8px;
                                                border-radius: 12px;
                                                font-size: 0.9em;
                                            ">
                                                ${startTime} - ${endTime}
                                            </span>
                                        </div>
                                    `;
                                }).join('');

                                // Calculate the actual option number (excluding 100% options)
                                const visibleOptions = data.variations.filter(v => 
                                    (v.scheduleIndices.length / schedules.length * 100) < 100
                                );
                                const optionNumber = visibleOptions.indexOf(variation) + 1;
                                
                                return `
                                    <div class="variation-card" style="
                                        background: var(--bg-color);
                                        border-radius: 8px;
                                        padding: 12px;
                                        position: relative;
                                    ">
                                        <div class="variation-header" style="
                                            display: flex;
                                            justify-content: space-between;
                                            align-items: center;
                                            margin-bottom: 8px;
                                        ">
                                            <span style="font-weight: bold; color: var(--text-color);">خيار ${optionNumber}</span>
                                            <span style="
                                                background: ${courseColor};
                                                padding: 2px 8px;
                                                border-radius: 10px;
                                                font-size: 0.8em;
                                                color: white;
                                            ">${schedulePercentage}% من الجداول</span>
                                        </div>
                                        <div style="color: var(--text-color); font-size: 0.9em;">
                                            <div style="margin-bottom: 8px;">${variation.instructor}</div>
                                            <div class="time-blocks" style="margin: 10px 0;">
                                                ${timeBlocks}
                                            </div>
                                        </div>
                                        <div style="
                                            font-size: 0.8em;
                                            color: var(--text-color);
                                            margin-top: 12px;
                                            text-align: right;
                                        ">
                                            <div style="margin-bottom: 6px; opacity: 0.7;">متوفر في الجداول:</div>
                                            <div class="schedule-numbers" style="
                                                display: grid;
                                                grid-template-columns: repeat(auto-fill, minmax(40px, 1fr));
                                                gap: 6px;
                                                direction: rtl;
                                                justify-content: flex-start;
                                            ">
                                                ${(() => {
                                                    // Group consecutive numbers
                                                    const groups = [];
                                                    let currentGroup = [];
                                                    variation.scheduleIndices.forEach((index, i) => {
                                                        if (i === 0 || index !== variation.scheduleIndices[i-1] + 1) {
                                                            if (currentGroup.length > 0) groups.push(currentGroup);
                                                            currentGroup = [index];
                                                        } else {
                                                            currentGroup.push(index);
                                                        }
                                                    });
                                                    if (currentGroup.length > 0) groups.push(currentGroup);

                                                    return groups.map(group => {
                                                        if (group.length === 1) {
                                                            return `
                                                                <div class="schedule-number" 
                                                                    onclick="currentScheduleIndex=${group[0]-1}; renderScheduleWithOptions(currentResult); document.getElementById('scheduleTableTop').scrollIntoView({behavior: 'smooth'});"
                                                                    style="
                                                                        background: ${courseColor}CC;
                                                                        color: white;
                                                                        padding: 8px;
                                                                        border-radius: 50px;
                                                                        border: 2px solid ${courseColor};
                                                                        font-size: 0.9em;
                                                                        cursor: pointer;
                                                                        transition: all 0.2s ease;
                                                                        display: flex;
                                                                        align-items: center;
                                                                        justify-content: center;
                                                                        min-width: 40px;
                                                                        min-height: 40px;
                                                                        direction: ltr;
                                                                        position: relative;
                                                                        overflow: hidden;
                                                                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                                                    "
                                                                    onmouseover="this.style.background='${courseColor}F2'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'"
                                                                    onmouseout="this.style.background='${courseColor}CC'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'"
                                                                >${group[0]}</div>
                                                            `;
                                                        } else {
                                                            return `
                                                                <div class="schedule-number-range" 
                                                                    style="
                                                                        grid-column: span ${Math.min(3, group.length)};
                                                                        background: ${courseColor}CC;
                                                                        color: white;
                                                                        padding: 8px 16px;
                                                                        border-radius: 50px;
                                                                        border: 2px solid ${courseColor};
                                                                        font-size: 0.9em;
                                                                        display: flex;
                                                                        align-items: center;
                                                                        justify-content: center;
                                                                        gap: 8px;
                                                                        direction: ltr;
                                                                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                                                                        transition: all 0.2s ease;
                                                                    "
                                                                    onmouseover="this.style.background='${courseColor}F2'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.2)'"
                                                                    onmouseout="this.style.background='${courseColor}CC'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(0,0,0,0.1)'"
                                                                >
                                                                    <span onclick="currentScheduleIndex=${group[0]-1}; renderScheduleWithOptions(currentResult); document.getElementById('scheduleTableTop').scrollIntoView({behavior: 'smooth'});"
                                                                        style="
                                                                            cursor: pointer;
                                                                            background: ${courseColor}E6;
                                                                            color: white;
                                                                            padding: 4px 12px;
                                                                            border-radius: 50px;
                                                                            transition: all 0.2s ease;
                                                                        "
                                                                        onmouseover="this.style.background='${courseColor}'"
                                                                        onmouseout="this.style.background='${courseColor}E6'"
                                                                    >${group[0]}</span>
                                                                    <span style="color: white;">-</span>
                                                                    <span onclick="currentScheduleIndex=${group[group.length-1]-1}; renderScheduleWithOptions(currentResult); document.getElementById('scheduleTableTop').scrollIntoView({behavior: 'smooth'});"
                                                                        style="
                                                                            cursor: pointer;
                                                                            background: ${courseColor}E6;
                                                                            color: white;
                                                                            padding: 4px 12px;
                                                                            border-radius: 50px;
                                                                            transition: all 0.2s ease;
                                                                        "
                                                                        onmouseover="this.style.background='${courseColor}'"
                                                                        onmouseout="this.style.background='${courseColor}E6'"
                                                                    >${group[group.length-1]}</span>
                                                                </div>
                                                            `;
                                                        }
                                                    }).join('');
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                `;
                            })
                            .filter(Boolean) // Remove empty strings from skipped variations
                            .join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    overviewHTML += '</div>';
    return overviewHTML;
}

// Helper function to analyze conflicts and find the most problematic courses
function analyzeConflicts() {
    const conflictCounts = new Map();
    const conflictDetails = new Map();

    scheduleConflicts.forEach(conflict => {
        const course1 = conflict.course1.section_course;
        const course2 = conflict.course2.section_course;

        // Count conflicts per course pair
        const coursePair = [course1, course2].sort().join(' & ');
        conflictCounts.set(coursePair, (conflictCounts.get(coursePair) || 0) + 1);

        // Store conflict details
        if (!conflictDetails.has(coursePair)) {
            conflictDetails.set(coursePair, {
                courses: [conflict.course1, conflict.course2],
                times1: conflict.times1,
                times2: conflict.times2,
                count: 1
            });
        } else {
            conflictDetails.get(coursePair).count++;
        }
    });

    return {
        counts: conflictCounts,
        details: conflictDetails
    };
}

// Add new function to analyze which courses to remove
function analyzeConflictResolution() {
    // Track conflicts per course
    const courseConflicts = new Map();
    
    scheduleConflicts.forEach(conflict => {
        const course1 = conflict.course1.section_course;
        const course2 = conflict.course2.section_course;
        
        courseConflicts.set(course1, (courseConflicts.get(course1) || 0) + 1);
        courseConflicts.set(course2, (courseConflicts.get(course2) || 0) + 1);
    });
    
    // Sort courses by number of conflicts
    const sortedCourses = Array.from(courseConflicts.entries())
        .sort((a, b) => b[1] - a[1]);
    
    // Analyze impact of removing each course
    const removalSuggestions = sortedCourses.map(([course, conflictCount]) => {
        // Find all conflicts involving this course
        const relatedConflicts = scheduleConflicts.filter(conflict =>
            conflict.course1.section_course === course ||
            conflict.course2.section_course === course
        );
        
        // Get unique courses that would be resolved
        const resolvedCourses = new Set();
        relatedConflicts.forEach(conflict => {
            if (conflict.course1.section_course !== course) {
                resolvedCourses.add(conflict.course1.section_course);
            }
            if (conflict.course2.section_course !== course) {
                resolvedCourses.add(conflict.course2.section_course);
            }
        });
        
        return {
            course,
            conflictCount,
            resolvedCourses: Array.from(resolvedCourses),
            conflicts: relatedConflicts
        };
    });
    
    return removalSuggestions;
}

// Update generateConflictExplanation to show removal suggestions
function generateConflictExplanation() {
    if (scheduleConflicts.length === 0) {
        return `
            <div class="no-conflicts" style="
                padding: 20px;
                text-align: center;
                background: var(--bg-secondary);
                border-radius: 8px;
                margin: 20px 0;
                color: var(--text-color);
            ">
                لم يتم العثور على تعارضات محددة. قد يكون هذا بسبب تفضيلات المحاضرين أو قيود أخرى.
            </div>
        `;
    }

    const removalSuggestions = analyzeConflictResolution();
    
    let html = `
        <div class="conflicts-container" style="
            max-width: 1200px;
            margin: 20px auto;
            padding: 20px;
            background: var(--bg-secondary);
            border-radius: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            direction: rtl;
        ">
            <div style="
                background: var(--bg-color);
                padding: 15px;
                border-radius: 8px;
                margin-bottom: 20px;
                text-align: center;
                color: var(--text-color);
                border: 1px solid var(--border-color);
            ">
                <h3 style="margin: 0 0 10px 0;">توجد مشكلة تعارضات</h3>
                <p style="margin: 0;">يمكنك حل التعارضات عن طريق حذف إحدى المواد التالية:</p>
            </div>
    `;

    // Add suggestions
    removalSuggestions.forEach((suggestion, index) => {
        const courseColor = generateCourseColor(suggestion.course);
        
        html += `
            <div class="suggestion-card" style="
                background: var(--bg-color);
                border-radius: 8px;
                margin-bottom: 15px;
                padding: 20px;
                border: 1px solid var(--border-color);
                box-shadow: 0 2px 4px rgba(0,0,0,0.05);
            ">
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    flex-wrap: wrap;
                    gap: 10px;
                ">
                    <div style="
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    ">
                        <span style="
                            background: ${courseColor};
                            padding: 8px 16px;
                            border-radius: 8px;
                            color: white;
                            font-weight: bold;
                        ">${suggestion.course}</span>
                        <span style="
                            background: var(--bg-secondary);
                            padding: 4px 12px;
                            border-radius: 12px;
                            color: var(--text-color);
                        ">${suggestion.conflictCount} تعارض</span>
                    </div>
                    <div style="
                        background: ${courseColor}22;
                        padding: 8px 16px;
                        border-radius: 8px;
                        color: var(--text-color);
                    ">
                        اقتراح ${index + 1}
                    </div>
                </div>
                
                <div style="
                    background: ${courseColor}11;
                    padding: 15px;
                    border-radius: 8px;
                    margin-top: 15px;
                    border: 1px solid ${courseColor}22;
                ">
                    <div style="color: var(--text-color); margin-bottom: 10px;">
                        حذف هذه المادة سيحل التعارضات مع:
                    </div>
                    <div style="
                        display: flex;
                        flex-wrap: wrap;
                        gap: 8px;
                    ">
                        ${suggestion.resolvedCourses.map(course => `
                            <span style="
                                background: ${generateCourseColor(course)};
                                padding: 4px 12px;
                                border-radius: 15px;
                                color: white;
                                font-size: 0.9em;
                            ">${course}</span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

// Add new function to analyze course removal impact
function analyzeRemovalImpact() {
    // Get current maximum days off with all courses
    const currentSchedules = generateCombinations(groupCoursesByType(coursesData.filter(section => 
        selectedCourses.has(section.section_course)
    )));
    
    const currentResult = findSchedulesWithMostDaysOff(currentSchedules);
    const currentMaxDaysOff = currentResult.schedules.length > 0 ? 
        calculateDaysOff(currentResult.schedules[0]) : 0;

    // Analyze impact of removing each course
    const removalImpact = [];
    for (const course of selectedCourses) {
        // Generate schedules without this course
        const remainingCourses = new Set(selectedCourses);
        remainingCourses.delete(course);
        
        const schedulesWithoutCourse = generateCombinations(groupCoursesByType(coursesData.filter(section => 
            remainingCourses.has(section.section_course)
        )));
        
        const resultWithoutCourse = findSchedulesWithMostDaysOff(schedulesWithoutCourse);
        const maxDaysOffWithoutCourse = resultWithoutCourse.schedules.length > 0 ? 
            calculateDaysOff(resultWithoutCourse.schedules[0]) : 0;
        
        // Calculate which days would be freed
        const freedDays = resultWithoutCourse.schedules.length > 0 ? 
            findFreedDays(currentResult.schedules[0], resultWithoutCourse.schedules[0]) : [];
        
        removalImpact.push({
            course,
            currentDaysOff: currentMaxDaysOff,
            newDaysOff: maxDaysOffWithoutCourse,
            daysGained: maxDaysOffWithoutCourse - currentMaxDaysOff,
            freedDays
        });
    }
    
    return removalImpact.sort((a, b) => b.daysGained - a.daysGained);
}

// Helper function to calculate days off for a schedule
function calculateDaysOff(schedule) {
    const usedDays = new Set();
    schedule.forEach(section => {
        const slots = parseTimeSlots(section.section_times);
        slots.forEach(slot => usedDays.add(slot.day));
    });
    return 5 - usedDays.size;
}

// Helper function to find which days would be freed
function findFreedDays(currentSchedule, newSchedule) {
    const currentDays = new Set();
    const newDays = new Set();
    const removedCourseDays = new Set();
    
    // First find which course was removed by comparing the schedules
    const currentCourses = new Set(currentSchedule.map(section => section.section_course));
    const newCourses = new Set(newSchedule.map(section => section.section_course));
    const removedCourse = Array.from(currentCourses).find(course => !newCourses.has(course));
    
    // Get the days used by the removed course
    currentSchedule.forEach(section => {
        if (section.section_course === removedCourse) {
            const slots = parseTimeSlots(section.section_times);
            slots.forEach(slot => removedCourseDays.add(slot.day));
        }
    });
    
    // Get days used in the new schedule
    newSchedule.forEach(section => {
        const slots = parseTimeSlots(section.section_times);
        slots.forEach(slot => newDays.add(slot.day));
    });
    
    // A day is freed only if:
    // 1. It was used by the removed course
    // 2. It's not used by any other course in the new schedule
    return Array.from(removedCourseDays)
        .filter(day => !newDays.has(day))
        .sort();
}

// Helper function to group courses by type
function groupCoursesByType(sections) {
    const courseGroups = {};
    for (const section of sections) {
        if (!courseGroups[section.section_course]) {
            courseGroups[section.section_course] = {
                lectures: [],
                labs: []
            };
        }
        if (section.section_type === 'عملي') {
            courseGroups[section.section_course].labs.push(section);
        } else {
            courseGroups[section.section_course].lectures.push(section);
        }
    }
    return courseGroups;
}

// Update renderScheduleWithOptions to show removal impact analysis
function renderScheduleWithOptions(result) {
    console.log('Rendering schedule options:', result);
    const { schedules, message } = result;
    
    // Generate removal impact analysis if we have selected courses and valid schedules
    let removalAnalysisHTML = '';
    if (selectedCourses.size > 0 && schedules.length > 0) {
        const removalImpact = analyzeRemovalImpact();
        
        removalAnalysisHTML = `
            <div class="removal-impact-analysis" style="
                max-width: 1200px;
                margin: 20px auto;
                padding: 20px;
                background: var(--bg-secondary);
                border-radius: 12px;
                direction: rtl;
            ">
                <h3 style="
                    color: var(--text-color);
                    margin-bottom: 20px;
                    text-align: right;
                ">تحليل تأثير حذف المواد</h3>
                <div class="impact-cards" style="
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 15px;
                ">
                    ${removalImpact.filter(impact => impact.daysGained > 0 && impact.freedDays.length > 0).map(impact => {
                        const courseColor = generateCourseColor(impact.course);
                        const daysMap = {
                            1: 'الأحد',
                            2: 'الإثنين',
                            3: 'الثلاثاء',
                            4: 'الأربعاء',
                            5: 'الخميس'
                        };
                        
                        return `
                            <div class="impact-card" style="
                                background: var(--bg-color);
                                border-radius: 8px;
                                padding: 15px;
                                border: 1px solid var(--border-color);
                            ">
                                <div style="
                                    display: flex;
                                    justify-content: space-between;
                                    align-items: center;
                                    margin-bottom: 10px;
                                ">
                                    <span style="
                                        background: ${courseColor};
                                        padding: 8px 16px;
                                        border-radius: 8px;
                                        color: white;
                                        font-weight: bold;
                                    ">${impact.course}</span>
                                    ${impact.daysGained > 0 ? `
                                        <span style="
                                            background: var(--bg-secondary);
                                            padding: 4px 12px;
                                            border-radius: 12px;
                                            color: var(--text-color);
                                        ">+${impact.daysGained} يوم</span>
                                    ` : ''}
                                </div>
                                ${impact.daysGained > 0 ? `
                                    <div style="
                                        margin-top: 10px;
                                        color: var(--text-color);
                                    ">
                                        <div style="margin-bottom: 8px;">الأيام التي ستتحرر:</div>
                                        <div style="
                                            display: flex;
                                            gap: 8px;
                                            flex-wrap: wrap;
                                        ">
                                            ${impact.freedDays.map(day => `
                                                <span style="
                                                    background: ${courseColor}33;
                                                    padding: 4px 12px;
                                                    border-radius: 15px;
                                                    font-size: 0.9em;
                                                ">${daysMap[day]}</span>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : `
                                    <div style="
                                        color: var(--text-color);
                                        text-align: center;
                                        padding: 10px;
                                        background: var(--bg-secondary);
                                        border-radius: 8px;
                                        margin-top: 10px;
                                    ">
                                        حذف هذه المادة لن يزيد عدد الأيام الحرة
                                    </div>
                                `}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    scheduleResultEl.innerHTML = `
        <div class="schedule-header" style="
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 30px;
            border: 1px solid var(--border-color);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            animation: slideDown 0.3s ease-out;
        ">
            <div style="
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 20px;
            ">
                <div style="
                    background: var(--accent-color);
                    width: 40px;
                    height: 40px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                ">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width: 24px; height: 24px;">
                        <path d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18"></path>
                    </svg>
                </div>
                <h2 id="scheduleTableTop" style="
                    margin: 0;
                    color: var(--text-color);
                    font-size: 1.8em;
                    font-weight: 600;
                ">Your Schedule Results</h2>
            </div>
            <div class="optimization-message" style="
                background: var(--bg-color);
                padding: 15px 20px;
                border-radius: 8px;
                color: var(--text-color);
                font-size: 1.1em;
                display: flex;
                align-items: center;
                gap: 12px;
                border: 1px solid var(--border-color);
            ">
                <div style="
                    background: var(--accent-color);
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                ">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width: 20px; height: 20px;">
                        <path d="M20 6L9 17l-5-5"></path>
                    </svg>
                </div>
                <span>${message}</span>
            </div>
        </div>
        ${schedules.length === 0 ? generateConflictExplanation() : `
            ${removalAnalysisHTML}
            <div class="room-toggle" style="margin: 15px 0; text-align: right;">
                <button id="toggleRoomBtn" style="background: var(--bg-secondary); border: 1px solid var(--border-color);">
                    إظهار أرقام القاعات
                </button>
            </div>
            <div class="schedule-navigation"></div>
            <div class="timetable" style="direction: rtl;">
                <table style="width: 100%;">
                    <thead>
                        <tr>
                            <th>الوقت</th>
                            <th>الخميس</th>
                            <th>الأربعاء</th>
                            <th>الثلاثاء</th>
                            <th>الاثنين</th>
                            <th>الأحد</th>
                        </tr>
                    </thead>
                    <tbody id="scheduleBody">
                        <!-- Schedule will be populated here -->
                    </tbody>
                </table>
            </div>
            <div class="schedule-overview-container"></div>
        `}
    `;
    
    // Update the header
    const headerEl = scheduleResultEl.querySelector('h2');
    headerEl.style.cssText = 'color: var(--text-color);';
    
    // Update the message
    const messageDiv = scheduleResultEl.querySelector('.optimization-message');
    messageDiv.style.cssText = 'padding: 10px; margin: 15px 0; background-color: var(--bg-color); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-color);';
    // Format message with strong tags around numbers
    const formattedMessage = message.replace(/(\d+)/g, '<strong>$1</strong>');
    messageDiv.innerHTML = `<span>${formattedMessage}</span>`;

    // Setup room toggle button
    const toggleRoomBtn = scheduleResultEl.querySelector('#toggleRoomBtn');
    let showRooms = false;
    toggleRoomBtn.addEventListener('click', () => {
        showRooms = !showRooms;
        toggleRoomBtn.textContent = showRooms ? 'إخفاء أرقام القاعات' : 'إظهار أرقام القاعات';
        const roomElements = document.querySelectorAll('.room-number');
        roomElements.forEach(el => {
            el.style.display = showRooms ? 'block' : 'none';
        });
    });
    
    // Update navigation if there are schedules
    const navControls = scheduleResultEl.querySelector('.schedule-navigation');
    if (schedules.length > 0) {
        if (schedules.length > 1) {
            navControls.style.cssText = 'margin: 15px 0; display: flex; justify-content: center; gap: 10px; align-items: center; direction: ltr;';
            
            const buttonStyle = `
                padding: 8px 16px;
                border: none;
                border-radius: 4px;
                background-color: var(--primary-color);
                color: var(--text-color);
                cursor: pointer;
                font-size: 14px;
            `;
            
            const spanStyle = 'color: var(--text-color);';
            
            navControls.innerHTML = `
                <button onclick="previousSchedule()" style="${buttonStyle}" ${currentScheduleIndex === 0 ? 'disabled' : ''}>Previous</button>
                <span style="${spanStyle}">Schedule ${currentScheduleIndex + 1} of ${schedules.length}</span>
                <button onclick="nextSchedule()" style="${buttonStyle}" ${currentScheduleIndex === schedules.length - 1 ? 'disabled' : ''}>Next</button>
            `;
        } else {
            navControls.innerHTML = '';
        }
        
        // Render the current schedule
        renderSchedule(schedules[currentScheduleIndex]);
        
        // Add schedule overview if there are multiple schedules
        if (schedules.length > 1) {
            const overviewDiv = scheduleResultEl.querySelector('.schedule-overview-container');
            overviewDiv.innerHTML = generateScheduleOverview(schedules);
        }
    } else {
        navControls.innerHTML = '';
        const scheduleBody = document.getElementById('scheduleBody');
        if (scheduleBody) {
            scheduleBody.innerHTML = '<tr><td colspan="6"><div class="no-schedule" style="text-align: center; padding: 20px; color: var(--text-color);">No valid schedules found. Try selecting different courses or changing your optimization preferences.</div></td></tr>';
        }
    }
}

// Navigation functions
function nextSchedule() {
    if (!currentResult) return;
    
    if (currentScheduleIndex < currentResult.schedules.length - 1) {
        currentScheduleIndex++;
        renderScheduleWithOptions(currentResult);
    }
}

function previousSchedule() {
    if (!currentResult) return;
    
    if (currentScheduleIndex > 0) {
        currentScheduleIndex--;
        renderScheduleWithOptions(currentResult);
    }
}

// Render the optimized schedule
function renderSchedule(schedule) {
    console.log('Rendering schedule:', schedule);
    if (!schedule) return;

    const scheduleBodyEl = document.getElementById('scheduleBody');
    if (!scheduleBodyEl) {
        console.error('Schedule body element not found!');
        return;
    }

    // Create tbody content
    let tbodyContent = '';
    
    for (let hour = 8; hour <= 17; hour++) {
        // Check if this hour has any courses across all days
        let hasCoursesInHour = false;
        const startTime = hour * 60;
        
        for (let day = 1; day <= 5; day++) {
            const coursesInSlot = schedule.filter(section => {
                const slots = parseTimeSlots(section.section_times);
                return slots.some(slot => 
                    slot.day === day && 
                    slot.start <= startTime && 
                    slot.end > startTime
                );
            });
            if (coursesInSlot.length > 0) {
                hasCoursesInHour = true;
                break;
            }
        }
        
        // Skip this hour if no courses are scheduled
        if (!hasCoursesInHour) continue;

        const period = hour < 12 ? 'ص' : 'م';
        const displayHour = hour <= 12 ? hour : hour - 12;
        
        tbodyContent += `<tr style="height: 80px;">`;
        
        // Time column
        tbodyContent += `
            <td style="
                font-weight: bold;
                text-align: center;
                padding: 10px;
                border: 1px solid var(--border-color);
                background-color: var(--bg-secondary);
                color: var(--text-color);
                width: 100px;
            ">${displayHour}:00 ${period}</td>
        `;
        
        // Day columns - RTL order (1 to 5)
        for (let day = 1; day <= 5; day++) {
            const coursesInSlot = schedule.filter(section => {
                const slots = parseTimeSlots(section.section_times);
                return slots.some(slot => 
                    slot.day === day && 
                    slot.start <= startTime && 
                    slot.end > startTime
                );
            });

            tbodyContent += `
                <td style="
                    border: 1px solid var(--border-color);
                    padding: 5px;
                    position: relative;
                    vertical-align: top;
                    height: 80px;
                    width: calc((100% - 100px) / 5);
                    background-color: var(--bg-color);
                    text-align: right;
                ">
            `;

            if (coursesInSlot.length > 0) {
                coursesInSlot.forEach(course => {
                    const roomMatch = course.section_times.match(new RegExp(`${day}.*?@r\\s*([^\\s@]+)`));
                    const room = roomMatch ? roomMatch[1] : 'TBA';
                    const courseColor = generateCourseColor(course.section_course);
                    
                    // Use section_number directly from the course object
                    const sectionNumber = course.section_number || 'N/A';
                    
                    tbodyContent += `
                        <div class="course-block ${course.section_type === 'عملي' ? 'lab-section' : 'lecture-section'}"
                            data-course="${course.section_course}"
                            data-section="${sectionNumber}"
                            style="
                                padding: 12px 12px 12px 80px;
                                border-radius: 12px;
                                background: ${courseColor};
                                color: white;
                                font-size: 0.9em;
                            ">
                            <strong style="display: block; margin-bottom: 4px;">${course.section_course}</strong>
                            <small style="display: block;">${course.section_instructor}</small>
                            <small class="room-number" style="display: none;">قاعة: ${room}</small>
                        </div>
                    `;
                });
            }

            tbodyContent += `</td>`;
        }
        
        tbodyContent += `</tr>`;
    }
    
    // Update the schedule body
    scheduleBodyEl.innerHTML = tbodyContent;
    
    // Update table headers for RTL
    const tableHeaders = document.querySelector('.timetable thead tr');
    if (tableHeaders) {
        tableHeaders.innerHTML = `
            <th>الوقت</th>
            <th>الأحد</th>
            <th>الاثنين</th>
            <th>الثلاثاء</th>
            <th>الأربعاء</th>
            <th>الخميس</th>
        `;
    }
    
    console.log('Schedule rendered successfully');
}

// Update the color generation function to create modern gradients
function generateCourseColor(courseName) {
    // Check if we already have a color for this course
    if (courseColors.has(courseName)) {
        return courseColors.get(courseName);
    }

    // Generate a hash of the course name
    let hash = 0;
    for (let i = 0; i < courseName.length; i++) {
        hash = courseName.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Generate two different hues for gradient
    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 20 + (hash % 40)) % 360; // Slightly different hue
    
    // Generate HSL colors with good saturation and lightness for dark theme
    const saturation = 75 + (hash % 15); // 75-90%
    const lightness1 = 30 + (hash % 10); // 30-40%
    const lightness2 = lightness1 - 10; // Slightly darker
    
    // Create gradient with transparency
    const color = `linear-gradient(145deg, 
        hsla(${hue1}, ${saturation}%, ${lightness1}%, 0.95) 0%, 
        hsla(${hue2}, ${saturation}%, ${lightness2}%, 0.95) 100%)`;
    
    // Store the color for consistency
    courseColors.set(courseName, color);
    return color;
}

// Add styles for closed sections indicators
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    .course-item .closed-indicator {
        display: inline-block;
        background: var(--accent-color);
        color: white;
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.8em;
        margin-right: 8px;
        opacity: 0.7;
    }
    .course-item:has(.closed-indicator):not(.has-closed) {
        opacity: 0.5;
        pointer-events: none;
        cursor: not-allowed;
        position: relative;
    }
`;
document.head.appendChild(styleSheet); 