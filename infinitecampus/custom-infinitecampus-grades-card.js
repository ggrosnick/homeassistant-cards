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
    set hass(hass) {
        this._hass = hass;

        this.students = [];
        this.grades = [];

        if (Array.isArray(this.config.entities)) {
            const configStudents = this.config.entities.find(a => a.entity.includes("students"))
            const configGrades = this.config.entities.find(a => a.entity.includes("grades"))

            const eStudents = configStudents && configStudents.entity in this._hass.states ? this._hass.states[configStudents.entity] : null
            const eGrades = configGrades && configGrades.entity in this._hass.states ? this._hass.states[configGrades.entity] : null

            if (eStudents && eStudents.attributes.student) {
                this.students = eStudents.attributes.student;
            }

            if (eGrades && eGrades.attributes.grade) {
                this.grades = eGrades.attributes.grade;
            }
        }
    }

    render() {
        return html`
      ${this._renderStyle()}
      <ha-card header="Infinite Campus - Grades">
        <div class="card-content">
          ${this.students.map(student => {
            const studentGrades = this.grades.filter(g => g.person_id == student.personid);
            if (studentGrades.length === 0) return html``;

            return html`
              <div class="student-section">
                <div class="student-header">
                  <ha-icon icon="mdi:account-school"></ha-icon>
                  <span class="student-name">${student.firstname} ${student.lastname}</span>
                </div>
                <div class="grades-list">
                  ${studentGrades.map(grade => html`
                    <div class="grade-item">
                      <div class="course-info">
                        <span class="course-name">${grade.course_name}</span>
                        <span class="task-name">${grade.task_name}</span>
                      </div>
                      <div class="grade-values">
                        <span class="letter-grade">${grade.current_grade}</span>
                        <span class="percentage">${grade.current_score}%</span>
                      </div>
                    </div>
                  `)}
                </div>
              </div>
            `;
        })}
        </div>
      </ha-card>
    `;
    }

    _renderStyle() {
        return html`
      <style>
        .student-section {
          margin-bottom: 1.5em;
        }
        .student-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-weight: bold;
          border-bottom: 1px solid var(--divider-color);
          padding-bottom: 4px;
        }
        .student-name {
          font-size: 1.1em;
        }
        .grades-list {
          margin-left: 24px;
        }
        .grade-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid var(--divider-color, #eee);
        }
        .grade-item:last-child {
          border-bottom: none;
        }
        .course-info {
          display: flex;
          flex-direction: column;
        }
        .course-name {
          font-weight: 500;
          color: var(--primary-text-color);
        }
        .task-name {
          font-size: 0.8em;
          color: var(--secondary-text-color);
        }
        .grade-values {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .letter-grade {
          font-weight: bold;
          font-size: 1.2em;
          color: var(--primary-color, #3D95EC);
          min-width: 1.5em;
          text-align: center;
        }
        .percentage {
          font-size: 0.9em;
          color: var(--secondary-text-color);
          min-width: 3.5em;
          text-align: right;
        }
      </style>
    `;
    }

    setConfig(config) {
        if (!config.entities) {
            throw new Error('You need to define entities');
        }
        this.config = config;
    }

    getCardSize() {
        return this.students.length * 2 + 1;
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
