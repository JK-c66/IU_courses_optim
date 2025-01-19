# Course Schedule Viewer

A modern, dark-themed web application for viewing and organizing course schedule data. The application accepts JSON input and displays course information in an organized, searchable format.

## Features

- Two input methods:
  - Direct JSON paste
  - File drop/upload
- Modern dark theme interface
- Course grouping by name
- Search functionality across all fields
- Filter by course availability (open/closed)
- Responsive design for all screen sizes
- Detailed section information display

## Usage

1. Open `index.html` in a web browser
2. Input your course data using either method:
   - Paste JSON into the text area and click "Parse Data"
   - Drag and drop a JSON file onto the drop zone
3. Use the search bar to find specific courses, instructors, or section numbers
4. Use the filter dropdown to show only open or closed sections
5. View course information organized in cards

## JSON Format

The application expects an array of course objects with the following structure:

```json
{
    "section_number": "string",
    "section_course": "string",
    "section_type": "string",
    "section_credit": "string",
    "section_availability": "string",
    "section_times": "string",
    "section_instructor": "string"
}
```

## Time Format

The time string uses special delimiters:
- `@t` for time
- `@r` for room
- `@n` for new time slot

Example: `"2 @t 08:00 ص - 08:50 ص @r 210 @n 2 @t 09:00 ص - 09:50 ص @r 210"` 