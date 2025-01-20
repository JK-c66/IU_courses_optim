// Global state
let coursesData = [];
let selectedCourses = new Set();
let selectedDoctors = new Map(); // course -> selected doctor
let currentScheduleIndex = 0; // Track which schedule is being displayed
let currentResult = null; // Store current schedule result
let courseColors = new Map();

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
    window.location.href = '../page1/index.html';
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
            fileName.textContent = file.name;
            handleFileUpload(file);
        }
    });
}

function handleFileUpload(file) {
    if (file.type !== 'application/json') {
        alert('Please upload a JSON file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        processInputData(e.target.result);
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
        // Setup all event listeners
        setupEventListeners();
        setupInputHandlers();
        
        // Add default styles to schedule container
        if (scheduleResultEl) {
            scheduleResultEl.style.cssText = 'display: block; margin: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;';
        }
        if (scheduleResultEl) {
            scheduleResultEl.style.cssText = 'width: 100%; overflow-x: auto;';
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
            return `
                <div class="course-item" data-course="${course}">
                    <h3>${course}</h3>
                    <p>Click to select${hasLab ? ' (includes lab)' : ''}</p>
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
    document.querySelectorAll('input[name="optimization"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'specific-doctors') {
                showDoctorPreferences();
            } else {
                doctorPreferencesEl.style.display = 'none';
            }
        });
    });

    // Optimize button
    optimizeBtn.addEventListener('click', generateSchedule);
}

// Show doctor preferences when that option is selected
function showDoctorPreferences() {
    if (selectedCourses.size === 0) {
        alert('Please select courses first');
        return;
    }

    const doctorOptions = Array.from(selectedCourses).map(course => {
        const sections = coursesData.filter(section => section.section_course === course);
        const doctors = new Set(sections.map(section => section.section_instructor));

        return `
            <div class="course-doctors">
                <h3>${course}</h3>
                <select data-course="${course}" class="doctor-select">
                    <option value="">Any Doctor</option>
                    ${Array.from(doctors).map(doctor => 
                        `<option value="${doctor}">${doctor}</option>`
                    ).join('')}
                </select>
            </div>
        `;
    }).join('');

    doctorPreferencesEl.innerHTML = `
        <h2>3. Select Preferred Doctors</h2>
        ${doctorOptions}
    `;
    doctorPreferencesEl.style.display = 'block';

    // Setup doctor selection listeners
    doctorPreferencesEl.querySelectorAll('select').forEach(select => {
        select.addEventListener('change', (e) => {
            const course = e.target.dataset.course;
            const doctor = e.target.value;
            if (doctor) {
                selectedDoctors.set(course, doctor);
            } else {
                selectedDoctors.delete(course);
            }
        });
    });
}

// Generate the optimized schedule
function generateSchedule() {
    if (selectedCourses.size === 0) {
        alert('Please select at least one course');
        return;
    }

    console.log('Selected courses:', Array.from(selectedCourses));
    console.log('Selected doctors:', Object.fromEntries(selectedDoctors));

    const optimizationType = document.querySelector('input[name="optimization"]:checked')?.value;
    if (!optimizationType) {
        alert('Please select an optimization preference');
        return;
    }

    console.log('Optimization type:', optimizationType);

    // Get all valid sections for selected courses
    const validSections = coursesData.filter(section => {
        if (!selectedCourses.has(section.section_course)) return false;
        if (selectedDoctors.has(section.section_course)) {
            return section.section_instructor === selectedDoctors.get(section.section_course);
        }
        return true;
    });

    console.log('Valid sections count:', validSections.length);

    // Group sections by course and type
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

    console.log('Course groups:', courseGroups);

    // Generate all possible combinations
    const combinations = generateCombinations(courseGroups);
    console.log('Generated combinations count:', combinations.length);
    
    // Find the best combinations based on optimization type
    currentResult = findBestSchedule(combinations, optimizationType);
    console.log('Best schedule result:', currentResult);
    
    if (currentResult.schedules.length > 0) {
        currentScheduleIndex = 0;
        renderScheduleWithOptions(currentResult);
    } else {
        alert(currentResult.message || 'No valid schedule found with the given constraints');
    }
}

// Helper function to parse time slots from the time string
function parseTimeSlots(timeString) {
    if (!timeString || timeString.trim() === '') {
        return []; // Return empty array for empty time strings (valid for some courses)
    }
    
    const slots = [];
    const parts = timeString.split('@n');
    
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
                slots.push({
                    day: day,
                    start: start,
                    end: end
                });
            }
        }
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
            // Add lecture sections
            for (const lecture of sections.lectures) {
                if (!lecture.section_times) continue; // Skip sections with no times
                
                if (sections.labs.length > 0) {
                    // If course has labs, add each valid lecture-lab pair
                    for (const lab of sections.labs) {
                        if (!lab.section_times) continue; // Skip labs with no times
                        
                        // Check if lab and lecture have the same instructor or if they can be mixed
                        if (!selectedDoctors.has(course) || 
                            lab.section_instructor === lecture.section_instructor) {
                            const newCombination = [...combination, lecture, lab];
                            // Only add if there are no time conflicts
                            if (!hasTimeConflict(newCombination)) {
                                currentCombinations.push(newCombination);
                            }
                        }
                    }
                } else {
                    // Course doesn't have labs, just add the lecture
                    const newCombination = [...combination, lecture];
                    // Only add if there are no time conflicts
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

// Helper function to check for time conflicts
function hasTimeConflict(sections) {
    for (let i = 0; i < sections.length; i++) {
        for (let j = i + 1; j < sections.length; j++) {
            if (sectionsOverlap(sections[i], sections[j])) {
                return true;
            }
        }
    }
    return false;
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
            message: 'No valid schedules found that meet all requirements' 
        };
    }
    
    switch (optimizationType) {
        case 'max-days-off':
            return findSchedulesWithMostDaysOff(combinations);
        case 'thursday-off':
            return findSchedulesWithThursdayOff(combinations);
        case 'specific-doctors':
            return {
                schedules: [combinations[0]],
                message: 'Found schedule with specified doctors'
            };
        default:
            return {
                schedules: [combinations[0]],
                message: 'Found valid schedule'
            };
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
            // Check if time parsing failed
            if (slots.length === 0) {
                console.error('Invalid time format found:', section.section_times);
                hasInvalidTimes = true;
                break;
            }
            slots.forEach(slot => usedDays.add(slot.day));
        }

        // Skip schedules with invalid times
        if (hasInvalidTimes) continue;
        
        const daysOff = 5 - usedDays.size;
        
        // Validate the days off calculation
        if (daysOff < 0 || daysOff > 5) {
            console.error('Invalid days off calculation:', daysOff, 'for schedule:', schedule);
            continue;
        }
        
        if (daysOff > maxDaysOff) {
            maxDaysOff = daysOff;
            bestSchedules = [schedule];
        } else if (daysOff === maxDaysOff) {
            bestSchedules.push(schedule);
        }
    }
    
    // Only return schedules if we found valid ones
    if (bestSchedules.length === 0) {
        return {
            schedules: [],
            message: 'No valid schedules found - there might be issues with the time format in the data'
        };
    }
    
    return {
        schedules: bestSchedules,
        message: `Found ${bestSchedules.length} schedule(s) with ${maxDaysOff} day(s) off`
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
    });

    return {
        schedules: thursdayOffSchedules,
        message: `Found ${thursdayOffSchedules.length} schedule(s) with Thursday off`
    };
}

// Generate overview of all schedule differences
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
        ">تحليل الجداول (${schedules.length} خيارات)</h3>
    `;
    
    // Sort courses by number of variations
    const sortedCourses = Array.from(courseVariations.entries())
        .sort((a, b) => b[1].variations.length - a[1].variations.length);
    
    for (const [course, data] of sortedCourses) {
        const courseColor = generateCourseColor(course);
        
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
                    ">${data.variations.length} خيارات</span>
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
                        ${data.variations.map((variation, index) => {
                            const slots = parseTimeSlots(variation.times);
                            const timeBlocks = slots.map(slot => {
                                const days = ['', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
                                const startHour = Math.floor(slot.start/60);
                                const startMin = String(slot.start%60).padStart(2,'0');
                                const endHour = Math.floor(slot.end/60);
                                const endMin = String(slot.end%60).padStart(2,'0');
                                const period = startHour >= 12 ? 'م' : 'ص';
                                const displayStartHour = startHour > 12 ? startHour - 12 : startHour;
                                const displayEndHour = endHour > 12 ? endHour - 12 : endHour;
                                
                                return `
                                    <div class="time-block" style="
                                        background: ${courseColor}22;
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
                                            background: ${courseColor}33;
                                            padding: 2px 8px;
                                            border-radius: 12px;
                                            font-size: 0.9em;
                                        ">
                                            ${displayStartHour}:${startMin} - ${displayEndHour}:${endMin} ${period}
                                        </span>
                                    </div>
                                `;
                            }).join('');
                            
                            const scheduleCount = variation.scheduleIndices.length;
                            const schedulePercentage = (scheduleCount / schedules.length * 100).toFixed(0);
                            
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
                                        <span style="font-weight: bold; color: var(--text-color);">خيار ${index + 1}</span>
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
                                        opacity: 0.7;
                                        margin-top: 8px;
                                        text-align: left;
                                    ">
                                        الجداول: ${variation.scheduleIndices.join(', ')}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    overviewHTML += '</div>';
    return overviewHTML;
}

// Update renderScheduleWithOptions to show the overview
function renderScheduleWithOptions(result) {
    console.log('Rendering schedule options:', result);
    const { schedules, message } = result;
    
    scheduleResultEl.innerHTML = `
        <h2>Your Schedule Results</h2>
        <div class="optimization-message"></div>
        <div class="schedule-overview-container"></div>
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
    `;
    
    // Update the header
    const headerEl = scheduleResultEl.querySelector('h2');
    headerEl.style.cssText = 'color: var(--text-color);';
    
    // Update the message
    const messageDiv = scheduleResultEl.querySelector('.optimization-message');
    messageDiv.style.cssText = 'padding: 10px; margin: 15px 0; background-color: var(--bg-color); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-color);';
    messageDiv.textContent = message;
    
    // Add schedule overview if there are multiple schedules
    if (schedules.length > 1) {
        const overviewDiv = scheduleResultEl.querySelector('.schedule-overview-container');
        overviewDiv.innerHTML = generateScheduleOverview(schedules);
    }
    
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
                            <small style="display: block;">قاعة: ${room}</small>
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