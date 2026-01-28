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
    }
  }

  render() {
    return html
      `
    ${this._renderStyle()}
    ${html
        `
      <ha-card header="Infinite Campus - Grades">
        <div class="card-content">
        ${this.students.map(student =>
          html
            `
            <div class="info flex">
              <div>
                <span class="student_name"><ha-icon icon="mdi:account-school"></ha-icon> ${student.firstname} ${student.lastname} (${student.studentnumber})</span>
                <div class="secondary">
                ${this.grades.map(grade =>
              html
                `
                  ${grade.person_id == student.personid ? html
                  `
                    <span>${grade.course_name}</span>
                    <mwc-list class="mdc-list--dense">
                      <mwc-list-item class="mwc-compact">
                        <span>${grade.task_name} - ${grade.current_grade} (${grade.current_score}%)</span>
                      </mwc-list-item>
                    </mwc-list>
                    `
                  : ""}
                  `
            )}
                </div>
              </div>
            </div>
          `
        )}
        </div>
      </ha-card>
      `
      }
    `
  }

  _renderStyle() {
    return html
      `
      <style>
        .info {
          padding-bottom: 1em;
        }
        .flex {
          display: flex;
          justify-content: space-between;
        }
        .secondary {
          display: block;
          color: #3D95EC;
          margin-left: 28px;
        }
        .mwc-compact{
          height: 24px !important
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
