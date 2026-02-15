import { LitElement, html } from "https://unpkg.com/lit?module";

// Configure the preview in the Lovelace card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'infinite-campus-grades',
  name: 'Infinite Campus - Grades Card',
  preview: false,
  description: 'A card used to display Infinite Campus Grades.',
});

class InfiniteCampusGrades extends LitElement {
  // Whenever the state changes, a new `hass` object is set. Use this to
  // update your content.
  set hass(hass) {
    // Initialize the content if it's not there yet.
    this._hass = hass;

    this.students = new Array();
    this.grades = new Array();
    this.currentGrades = new Array();
    this.gradesByStudent = new Map();

    if (Array.isArray(this.config.entities)) {
      var configStudents = this.config.entities.find(a => a.entity == "sensor.infinite_campus_students")
      var configGrades = this.config.entities.find(a => a.entity == "sensor.infinite_campus_grades")

      var eStudents = configStudents.entity in this._hass.states ? this._hass.states[configStudents.entity] : null
      var eGrades = configGrades.entity in this._hass.states ? this._hass.states[configGrades.entity] : null

      eStudents.attributes.student.forEach(student => {
        this.students.push(student)
      })

      eGrades.attributes.grade.forEach(grade => {
        this.grades.push(grade)
      })

      const isTruthy = (value) => value === true || value === 1 || value === "1" || value === "true";
      const isCurrentGrade = (grade) => {
        if (!grade) {
          return false;
        }

        // Prefer explicit current/active flags when they exist.
        if ("is_current" in grade) return isTruthy(grade.is_current);
        if ("current" in grade) return isTruthy(grade.current);
        if ("is_active" in grade) return isTruthy(grade.is_active);
        if ("active" in grade) return isTruthy(grade.active);
        if ("term_is_current" in grade) return isTruthy(grade.term_is_current);

        // Fallback: hide finals if we don't have explicit current-term flags.
        var taskName = String(grade.task_name || "").toLowerCase();
        if (taskName.includes("final")) return false;

        // If no explicit flag exists, keep the entry.
        return true;
      }

      // Keep one current-grade entry per student/course.
      var currentByCourse = new Map();
      this.grades.forEach(grade => {
        if (!grade || !isCurrentGrade(grade) || grade.current_grade == null || grade.current_score == null) {
          return;
        }

        var key = `${grade.person_id}::${grade.course_name}`;
        currentByCourse.set(key, grade);
      });

      this.currentGrades = Array.from(currentByCourse.values());

      this.currentGrades.forEach((grade) => {
        var studentGrades = this.gradesByStudent.get(grade.person_id) || [];
        studentGrades.push(grade);
        this.gradesByStudent.set(grade.person_id, studentGrades);
      });

      this.gradesByStudent.forEach((studentGrades, personId) => {
        studentGrades.sort((a, b) => (a.course_name || "").localeCompare(b.course_name || ""));
        this.gradesByStudent.set(personId, studentGrades);
      });
    }
  }

  render() {
    return html
      `
    ${this._renderStyle()}
    ${html
        `
      <ha-card>
        <div class="card-title">Infinite Campus - Grades</div>
        <div class="card-content">
        <div class="students-row">
        ${this.students.map(student =>
          html
            `
            ${(() => {
              var studentGrades = this.gradesByStudent.get(student.personid) || [];
              var scoreTotal = studentGrades.reduce((acc, grade) => acc + (parseFloat(grade.current_score) || 0), 0);
              var avgScore = studentGrades.length ? (scoreTotal / studentGrades.length).toFixed(1) : null;

              return html`
              <div class="student-card">
                <div class="student-header">
                  <span class="student_name"><ha-icon icon="mdi:account-school"></ha-icon> ${student.firstname} ${student.lastname} (${student.studentnumber})</span>
                  <span class="student-avg">${avgScore == null ? "-" : `${avgScore}% avg`}</span>
                </div>
                <div class="secondary">
                ${studentGrades.length ? studentGrades.map(grade =>
                  html`
                  <div class="grade-row">
                    <span class="course-name">${grade.course_name}</span>
                    <span class="grade-pill ${this._gradeClass(grade.current_score)}">${grade.current_grade} (${grade.current_score}%)</span>
                  </div>
                  `
                ) : html`<span class="empty">No current grades</span>`}
                </div>
              </div>
              `;
            })()}
          `
        )}
        </div>
        </div>
      </ha-card>
      `
      }
    `
  }

  _gradeClass(score) {
    var n = parseFloat(score);
    if (isNaN(n)) return "grade-unknown";
    if (n >= 90) return "grade-a";
    if (n >= 80) return "grade-b";
    if (n >= 70) return "grade-c";
    return "grade-d";
  }

  _renderStyle() {
    return html
      `
      <style>
        .card-title {
          color: #0b1220;
          font-size: 22px;
          font-weight: 800;
          line-height: 1.2;
          padding: 8px 16px 4px;
        }

        .students-row {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 4px;
          scroll-snap-type: x proximity;
        }

        .students-row::-webkit-scrollbar {
          height: 8px;
        }

        .students-row::-webkit-scrollbar-thumb {
          background: var(--divider-color);
          border-radius: 999px;
        }

        .students-row::-webkit-scrollbar-track {
          background: transparent;
        }

        .student-card {
          flex: 1 1 clamp(320px, 48%, 520px);
          min-width: 320px;
          gap: 12px;
          border: 1px solid var(--divider-color);
          border-radius: 10px;
          padding: 10px 12px;
          scroll-snap-align: start;
        }

        .student-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .student_name {
          font-size: 15px;
          line-height: 1.25;
          font-weight: 700;
          color: #1f2937;
        }

        .student-avg {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .secondary {
          display: grid;
          gap: 6px;
        }

        .grade-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid rgba(31, 41, 55, 0.14);
          background: rgba(255, 255, 255, 0.82);
        }

        .course-name {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
        }

        .grade-pill {
          font-size: 13px;
          font-weight: 600;
          border-radius: 999px;
          padding: 2px 8px;
          white-space: nowrap;
        }

        .grade-a { background: rgba(46, 125, 50, 0.2); color: #1b5e20; }
        .grade-b { background: rgba(21, 101, 192, 0.2); color: #0d47a1; }
        .grade-c { background: rgba(245, 124, 0, 0.2); color: #e65100; }
        .grade-d { background: rgba(198, 40, 40, 0.2); color: #b71c1c; }
        .grade-unknown { background: rgba(120, 120, 120, 0.2); color: var(--primary-text-color); }

        .empty {
          color: var(--secondary-text-color);
          font-style: italic;
        }
      </style>
    `;
  }

  // The user supplied configuration. Throw an exception and Home Assistant
  // will render an error card.
  setConfig(config) {
    if (!config.entities) {
      throw new Error('You need to define entities');
    }
    this.config = config;
  }

  // The height of your card. Home Assistant uses this to automatically
  // distribute all cards over the available columns.
  getCardSize() {
    return 3;
  }

  static getConfigElement() {
    return document.createElement("content-card-editor");
  }

  static getStubConfig() {
    return {
      entities: [
        { entity: 'sensor.infinite_campus_students' },
        { entity: 'sensor.infinite_campus_grades' }
      ]
    }
  }

}

customElements.define('infinite-campus-grades', InfiniteCampusGrades);
