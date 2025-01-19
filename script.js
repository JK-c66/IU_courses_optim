// DOM Elements
const jsonInput = document.getElementById('jsonInput');
const parseTextBtn = document.getElementById('parseTextBtn');
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const courseDisplay = document.getElementById('courseDisplay');
const searchInput = document.getElementById('searchInput');
const filterSelect = document.getElementById('filterSelect');
const fileName = document.getElementById('fileName');

// Day mapping
const dayNames = {
    '1': { en: 'Sunday', ar: 'الأحد' },
    '2': { en: 'Monday', ar: 'الاثنين' },
    '3': { en: 'Tuesday', ar: 'الثلاثاء' },
    '4': { en: 'Wednesday', ar: 'الأربعاء' },
    '5': { en: 'Thursday', ar: 'الخميس' }
};

// Global state
let coursesData = [];

// Event Listeners
parseTextBtn.addEventListener('click', () => {
    const jsonText = jsonInput.value.trim();
    if (jsonText) {
        processJsonInput(jsonText);
    }
});

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
        updateFileName(file.name);
        handleFileUpload(file);
    }
});

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        updateFileName(file.name);
        handleFileUpload(file);
    }
});

searchInput.addEventListener('input', filterAndDisplayCourses);
filterSelect.addEventListener('change', filterAndDisplayCourses);

// File handling
function updateFileName(name) {
    fileName.textContent = name;
}

function handleFileUpload(file) {
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
        alert('Please upload a JSON file');
        updateFileName('No file chosen');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        processJsonInput(e.target.result);
    };
    reader.onerror = () => {
        alert('Error reading file');
        updateFileName('No file chosen');
    };
    reader.readAsText(file);
}

// JSON Processing
function processJsonInput(jsonText) {
    try {
        const data = JSON.parse(jsonText);
        if (Array.isArray(data)) {
            coursesData = data;
            filterAndDisplayCourses();
        } else {
            throw new Error('JSON must be an array of courses');
        }
    } catch (error) {
        alert('Error parsing JSON: ' + error.message);
    }
}

// Helper functions
function getSectionTypeClass(type) {
    if (type.includes('عملي') || type.toLowerCase().includes('lab')) {
        return 'is-lab';
    }
    return 'is-lecture';
}

function formatTimeDisplay(timeStr) {
    const [time, period] = timeStr.split(' ');
    const periodText = period.includes('ص') ? 'ص' : 'م';
    return `${time} ${periodText}`;
}

function formatTimes(timesString) {
    if (!timesString) return '';

    const timeSegments = timesString.split('@n').map(segment => {
        const parts = segment.trim().split('@');
        const dayNum = parts[0].trim();
        const timeStr = parts.find(p => p.startsWith('t '))?.substring(2).trim() || '';
        const room = parts.find(p => p.startsWith('r '))?.substring(2).trim() || '';

        const dayName = dayNames[dayNum]?.ar || dayNum;
        const [startTime, endTime] = timeStr.split('-').map(t => t.trim());

        return `
            <div class="time-slot">
                <span class="day-name">${dayName}</span>
                <span class="time-range">${formatTimeDisplay(startTime)} - ${formatTimeDisplay(endTime)}</span>
                ${room ? `<span class="room-info">| <span class="room-number">${room}</span></span>` : ''}
            </div>
        `;
    });

    return timeSegments.join('');
}

function formatCreditHours(credit) {
    const hours = parseInt(credit);
    if (hours === 1) return "ساعة معتمدة";
    if (hours === 2) return "ساعتين معتمدة";
    return `${hours} ساعات معتمدة`;
}

// Course Display
function filterAndDisplayCourses() {
    const searchTerm = searchInput.value.toLowerCase();
    const filterValue = filterSelect.value;

    const filteredCourses = coursesData.filter(course => {
        const matchesSearch = 
            course.section_course.toLowerCase().includes(searchTerm) ||
            course.section_instructor.toLowerCase().includes(searchTerm) ||
            course.section_number.includes(searchTerm);

        const matchesFilter = 
            filterValue === 'all' ||
            (filterValue === 'open' && course.section_availability === 'مفتوحة') ||
            (filterValue === 'closed' && course.section_availability === 'مغلقة');

        return matchesSearch && matchesFilter;
    });

    displayCourses(filteredCourses);
}

function displayCourses(courses) {
    courseDisplay.innerHTML = '';
    
    if (courses.length === 0) {
        courseDisplay.innerHTML = '<div class="no-results">لا توجد مقررات</div>';
        return;
    }
    
    // Group courses by course name
    const courseGroups = courses.reduce((groups, course) => {
        const name = course.section_course;
        if (!groups[name]) {
            groups[name] = {
                lectures: [],
                labs: []
            };
        }
        if (course.section_type === 'عملي') {
            groups[name].labs.push(course);
        } else {
            groups[name].lectures.push(course);
        }
        return groups;
    }, {});

    // Create cards for each course group
    Object.entries(courseGroups).forEach(([courseName, sections]) => {
        const courseCard = document.createElement('div');
        courseCard.className = 'course-card';
        courseCard.style.position = 'relative';
        
        // Check if it's a graduation project course
        if (courseName.includes('مشروع التخرج')) {
            courseCard.setAttribute('data-course-type', 'graduation-project');
        }

        const header = document.createElement('div');
        header.className = 'course-header';
        const mainSection = sections.lectures[0] || sections.labs[0];
        
        header.innerHTML = `
            <div class="course-title">${courseName}</div>
            <div class="course-info">
                ${mainSection.section_credit ? 
                    `<div class="section-credit">${formatCreditHours(mainSection.section_credit)}</div>` : ''}
                ${!courseName.includes('مشروع التخرج') ? `
                <div class="sections-count">
                    <span class="lecture-count">
                        <span class="count-number">${sections.lectures.length}</span>
                        <span class="count-label">شعبة نظري</span>
                    </span>
                    ${sections.labs.length > 0 ? `
                        <span class="lab-count">
                            <span class="count-number">${sections.labs.length}</span>
                            <span class="count-label">شعبة معمل</span>
                        </span>
                    ` : ''}
                </div>
                ` : ''}
            </div>
        `;

        const sectionsList = document.createElement('div');
        sectionsList.className = 'course-sections';

        // Display lectures
        sections.lectures.forEach(lecture => {
            const sectionBox = document.createElement('div');
            sectionBox.className = 'section-box is-lecture';
            
            sectionBox.innerHTML = `
                <div class="section-header">
                    <span class="section-number">${lecture.section_number}</span>
                    <span class="status-${lecture.section_availability === 'مفتوحة' ? 'open' : 'closed'}">
                        ${lecture.section_availability}
                    </span>
                </div>
                <div class="instructor-name">${lecture.section_instructor}</div>
                <div class="course-times">${formatTimes(lecture.section_times)}</div>
            `;

            // Find associated labs
            const associatedLabs = sections.labs.filter(lab => 
                lab.section_instructor === lecture.section_instructor
            );

            if (associatedLabs.length > 0) {
                const labsContainer = document.createElement('div');
                labsContainer.className = 'associated-labs';
                
                associatedLabs.forEach(lab => {
                    const labBox = document.createElement('div');
                    labBox.className = 'lab-box';
                    labBox.innerHTML = `
                        <div class="lab-header">
                            <span class="section-number">${courseName.includes('مشروع التخرج') ? lab.section_number : `معمل ${lab.section_number}`}</span>
                            <span class="status-${lab.section_availability === 'مفتوحة' ? 'open' : 'closed'}">
                                ${lab.section_availability}
                            </span>
                        </div>
                        <div class="instructor-name">${lab.section_instructor}</div>
                        <div class="course-times">${formatTimes(lab.section_times)}</div>
                    `;
                    labsContainer.appendChild(labBox);
                });
                
                sectionBox.appendChild(labsContainer);
            }

            sectionsList.appendChild(sectionBox);
        });

        // Display orphaned labs (labs without matching lectures)
        const orphanedLabs = sections.labs.filter(lab => 
            !sections.lectures.some(lecture => 
                lecture.section_instructor === lab.section_instructor
            )
        );

        if (orphanedLabs.length > 0) {
            orphanedLabs.forEach(lab => {
                const sectionBox = document.createElement('div');
                sectionBox.className = 'section-box is-lab';
                
                sectionBox.innerHTML = `
                    <div class="section-header">
                        <span class="section-number">${courseName.includes('مشروع التخرج') ? lab.section_number : `معمل ${lab.section_number}`}</span>
                        <span class="status-${lab.section_availability === 'مفتوحة' ? 'open' : 'closed'}">
                            ${lab.section_availability}
                        </span>
                    </div>
                    <div class="instructor-name">${lab.section_instructor}</div>
                    <div class="course-times">${formatTimes(lab.section_times)}</div>
                `;

                sectionsList.appendChild(sectionBox);
            });
        }

        courseCard.appendChild(header);
        courseCard.appendChild(sectionsList);
        courseDisplay.appendChild(courseCard);
    });
}

// Initialize empty state
filterAndDisplayCourses(); 