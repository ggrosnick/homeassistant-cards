import { LitElement, html } from "https://unpkg.com/lit?module";
import { classMap } from "https://unpkg.com/lit-html@2.3.1/directives/class-map.js?module"

// Configure the preview in the Lovelace card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'infinite-campus-homework',
  name: 'Infinite Campus - Homework Card',
  preview: false,
  description: 'A card used to display Infinite Campus Homework.',
});

class InfiniteCampusStudent extends LitElement {
  // Whenever the state changes, a new `hass` object is set. Use this to
  // update your content.
  set hass(hass) {
    // Initialize the content if it's not there yet.
    this._hass = hass;

    this.students = new Array();
    this.assignments = new Array();
    this.assignmentsByStudent = new Map();
    this.date = new Date().toLocaleDateString('en-CA');

    if (Array.isArray(this.config.entities)) {
      var configStudents = this.config.entities.find(a => a.entity == "sensor.infinite_campus_students")
      var configAssignments = this.config.entities.find(a => a.entity == "sensor.infinite_campus_assignments")

      if (!configStudents || !configAssignments) {
        return;
      }

      var eStudents = configStudents.entity in this._hass.states ? this._hass.states[configStudents.entity] : null
      var eAssignments = configAssignments.entity in this._hass.states ? this._hass.states[configAssignments.entity] : null

      if (!eStudents || !eStudents.attributes || !Array.isArray(eStudents.attributes.student)) {
        return;
      }
      if (!eAssignments || !eAssignments.attributes || !Array.isArray(eAssignments.attributes.assignment)) {
        return;
      }

      eStudents.attributes.student.forEach(student => {
        this.students.push(student)
      })

      eAssignments.attributes.assignment.forEach(assignment => {
        if ((Date.parse(assignment.duedate) >= Date.parse(this.date) || (assignment.missing)) && !assignment.scorepoints) {
          this.assignments.push(assignment)
        }
      })

      this.assignments.forEach((assignment) => {
        var key = assignment.personid;
        var studentAssignments = this.assignmentsByStudent.get(key) || [];
        studentAssignments.push(assignment);
        this.assignmentsByStudent.set(key, studentAssignments);
      })

      this.assignmentsByStudent.forEach((studentAssignments, personId) => {
        studentAssignments.sort((a, b) => {
          var d = Date.parse(a.duedate) - Date.parse(b.duedate);
          if (!isNaN(d) && d !== 0) return d;
          return (a.coursename || "").localeCompare(b.coursename || "");
        });
        this.assignmentsByStudent.set(personId, studentAssignments);
      })
    }
  }

  constructor(){
    super();
    this.addEventListener('check-homework', e => {
      console.log(e)
      const modal = this.shadowRoot.querySelector('assignment-dialog');
      modal.open = true;
      modal.title = e.detail.e.coursename;
      modal.assignmentname = e.detail.e.assignmentname;
      modal.totalpoints = e.detail.e.totalpoints;
      modal.comments = e.detail.e.comments;
      modal.assigneddate = e.detail.e.assigneddate;
      modal.duedate = e.detail.e.duedate;
      modal.missing = e.detail.e.missing == true ? e.detail.e.missing : false;
      modal.date = new Date().toLocaleDateString('en-CA');
    })
  }

  render(){
    return html
    `
    ${this._renderStyle()}
      <ha-card>
        <div class="card-title">Infinite Campus - Homework</div>
        <div class="card-content">
        <div class="students-row">
        ${this.students.map(student => 
          html
          `
            ${(() => {
              var studentAssignments = this.assignmentsByStudent.get(student.personid) || [];
              var missingCount = studentAssignments.filter(a => a.missing === true).length;
              var dueTodayCount = studentAssignments.filter(a => this._statusForAssignment(a) == "due-today").length;

              return html`
              <div class="student-card">
                <div class="student-header">
                  <span class="student_name"><ha-icon icon="mdi:account-school"></ha-icon> ${student.firstname} ${student.lastname} (${student.studentnumber})</span>
                  <span class="student-count">${studentAssignments.length} items</span>
                </div>
                <div class="student-summary">
                  <span class="summary-pill missing">Missing ${missingCount}</span>
                  <span class="summary-pill today">Due today ${dueTodayCount}</span>
                </div>
                <div class="secondary">
                ${studentAssignments.length ? studentAssignments.map(assignment =>
                  html
                  `
                  <div class="assignment-row ${this._statusForAssignment(assignment)}" @click="${() => this._handleClick(assignment)}">
                    <div class="assignment-main">
                      <span class="course-name">${assignment.coursename}</span>
                      <span class="assignment-name">${assignment.assignmentname}</span>
                    </div>
                    <span class="due-badge">${this._dueLabel(assignment)}</span>
                  </div>
                  `
                ) : html`<span class="empty">No upcoming or missing homework</span>`}
                </div>
              </div>
              `;
            })()}
          `
        )}
        </div>
        <assignment-dialog></assignment-dialog>
        </div>
      </ha-card>
    `
  }

  _statusForAssignment(assignment) {
    if (assignment.missing === true) return "missing";
    var due = Date.parse(assignment.duedate);
    var today = Date.parse(this.date);
    if (isNaN(due)) return "upcoming";
    if (due < today) return "overdue";
    if (due === today) return "due-today";
    return "upcoming";
  }

  _dueLabel(assignment) {
    var due = Date.parse(assignment.duedate);
    if (isNaN(due)) return "No due date";
    var dateText = new Date(due).toLocaleString('en-US', { month: 'numeric', day: 'numeric' });
    var status = this._statusForAssignment(assignment);
    if (status == "missing") return `${dateText} missing`;
    if (status == "overdue") return `${dateText} overdue`;
    if (status == "due-today") return `${dateText} today`;
    return dateText;
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

        .student-count {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .student-summary {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }

        .summary-pill {
          font-size: 12px;
          font-weight: 600;
          border-radius: 999px;
          padding: 2px 8px;
        }

        .summary-pill.missing {
          color: #b71c1c;
          background: rgba(198, 40, 40, 0.2);
        }

        .summary-pill.today {
          color: #0d47a1;
          background: rgba(21, 101, 192, 0.2);
        }

        .secondary {
          display: grid;
          gap: 6px;
        }

        .assignment-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 9px 10px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid rgba(31, 41, 55, 0.14);
          background: rgba(255, 255, 255, 0.82);
        }

        .assignment-main {
          display: grid;
          gap: 2px;
        }

        .course-name {
          font-size: 14px;
          font-weight: 600;
        }

        .assignment-name {
          font-size: 13px;
          color: #374151;
        }

        .due-badge {
          font-size: 12px;
          font-weight: 600;
          border-radius: 999px;
          padding: 2px 8px;
          white-space: nowrap;
          background: rgba(120, 120, 120, 0.2);
        }

        .assignment-row.missing .due-badge {
          color: #b71c1c;
          background: rgba(198, 40, 40, 0.2);
        }

        .assignment-row.overdue .due-badge {
          color: #e65100;
          background: rgba(245, 124, 0, 0.2);
        }

        .assignment-row.due-today .due-badge {
          color: #0d47a1;
          background: rgba(21, 101, 192, 0.2);
        }

        .assignment-row.upcoming .due-badge {
          color: #1b5e20;
          background: rgba(46, 125, 50, 0.2);
        }

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
        {entity:'sensor.infinite_campus_students'},
        {entity:'sensor.infinite_campus_courses'},
        {entity:'sensor.infinite_campus_assignments'}
      ] 
    }
  }

  _handleClick(e,assignment) {
    this.dispatchEvent(new CustomEvent('check-homework', {detail: {e}}));
  }

}

class AssignmentDialog extends LitElement{
  static get properties() {
    return {
      open: { type: Boolean },
      title: { type: String },
      text: { type: String },
      clickAction: { type: String }
    };
  }

  constructor() {
    super();
    this.open = false;
  }

  _renderStyle() {
    return html
    `
    <style>
      :host {
        font-family: Arial, Helvetica, sans-serif;
      }
      .wrapper {
        opacity: 0;
        position: absolute;
        z-index: 10;
        transition: opacity 0.25s ease-in;
      }
      .wrapper:not(.open) {
        visibility: hidden;
      }
      .wrapper.open {
        align-items: center;
        display: flex;
        justify-content: center;
        height: 100vh;
        position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        opacity: 1;
        visibility: visible;
      }
      .overlay {
        background: rgba(0, 0, 0, 0.8);
        height: 100%;
        width: 100%;
        position: relative;
      }
      .dialog {
        background: var( --ha-card-background, var(--card-background-color, white) );
        border-radius: 2px;
        max-width: 600px;
        padding: 1rem;
        position: absolute;
      }
      .dialog h1 {
        margin: 0 0 10px;
      }
      .dialog button {
        background-color: #3D95EC;
        color: white;
        width: 100%;
        font-size: 16px;
        padding: 15px 32px;
        border: none;
        border-radius: 10px;
        text-decoration: none;
        display: inline-block;
        margin-top: 10px;
      }
      .space-between {
        display: flex;
        justify-content: space-between;
      }
      .assignment-style {
        color: #3D95EC;
      }
      .assignment-due {
        color: #F1D019
      }
    </style>
    `;
  }

  render() {
    return html`
      ${this._renderStyle()}
      <div class="${classMap({wrapper: true, open: this.open})}">
        <div class="overlay" @click="${this.close}"></div>
        <div class="dialog">
          <h1 id="title">${this.title}</h1>
          <div id="content" class="content">
            <mwc-list class="mdc-list--dense">
              <mwc-list-item>${this.assignmentname}</mwc-list-item>
              ${this.missing ? "<mwc-list-item style='color:#a3262c;'><ha-icon icon='mdi:alert-box'></ha-icon>MISSING</mwc-list-item>" : ""}
              <mwc-list-item><ha-icon icon="mdi:counter"></ha-icon><span class="assignment-style">&ensp;Points: </span>${this.totalpoints}</mwc-list-item>
              <mwc-list-item><ha-icon icon="mdi:calendar"></ha-icon><span class="assignment-style">&ensp;Assigned On: </span>${new Date(Date.parse(this.assigneddate)).toLocaleString('en-US', {month: 'numeric', day:'numeric' })}</mwc-list-item>
              <mwc-list-item>${new Date(Date.parse(this.duedate)).toLocaleDateString('en-CA') <= this.date ? html`<ha-icon icon='mdi:calendar-alert' class='assignment-due'></ha-icon>` : html`<ha-icon icon='mdi:calendar-alert' ></ha-icon>`}<span class="assignment-style">&ensp;Due On: </span>${new Date(Date.parse(this.duedate)).toLocaleString('en-US', {month: 'numeric', day:'numeric' })}</mwc-list-item>
              <mwc-list-item><ha-icon icon="mdi:comment-text"></ha-icon><span class="assignment-style">&ensp;Comments: </span>${this.comments}</mwc-list-item>
            </mwc-list>
          </div>
          <button @click=${this.handleClick}>${this.clickAction}Close</button>
        </div>
      </div>
    `;
  }

  close() {
    this.open = false;
  }

  handleClick() {
    this.dispatchEvent(new CustomEvent('button-click'));
    this.close();
  }
}

customElements.define('assignment-dialog', AssignmentDialog);
customElements.define('infinite-campus-homework', InfiniteCampusStudent);
