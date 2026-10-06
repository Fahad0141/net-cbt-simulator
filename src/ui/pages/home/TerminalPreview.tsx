import { IconPerson } from './icons';
import s from './TerminalPreview.module.css';

const OPTIONS = ['x = 1', 'x = 3', 'x = 0', 'x = −3'];
const SAVED_OPTION = 1;
const BUTTONS = ['Save', 'Next', 'Prev', 'Review', 'Next Section', 'Prev Section', 'First', 'Last'];

const DESCRIPTION =
  'Illustration of the simulated CBT terminal: a Mathematics question, number 37 of 200, with four options, ' +
  'an answer saved, a clock showing 142 minutes remaining and the Save, Next, Prev, Review and Next Section buttons.';

/** A static, theme-aware sketch of the exam terminal for the landing hero. */
export function TerminalPreview() {
  return (
    <figure className={s.preview}>
      <div className={s.window} role="img" aria-label={DESCRIPTION}>
        <div className={s.titlebar}>
          <span className={s.lights}>
            <span />
            <span />
            <span />
          </span>
          <span className={s.brand}>NET e-Test</span>
          <span className={s.titleCode}>ENG-K7Q2-9XM4</span>
        </div>

        <div className={s.frame}>
          <div className={s.info}>
            <span className={s.infoSection}>Mathematics</span>
            <span className={s.infoTest}>NET-Engineering</span>
            <span className={s.infoUser}>NET26-48213</span>
          </div>

          <div className={s.bar}>
            <span>
              Question No : <span className={s.barValue}>37 of 200</span>
            </span>
            <span>
              Marks: <span className={s.barValue}>1</span>
            </span>
          </div>

          <div className={s.body}>
            <p className={s.stem}>
              If <i>f</i>(<i>x</i>) = <i>x</i>
              <sup>3</sup> {'−'} 6<i>x</i>
              <sup>2</sup> + 9<i>x</i> + 1, at which value of <i>x</i> does <i>f</i> have a local
              minimum?
            </p>
            <div className={s.photo}>
              <IconPerson size={30} />
              <span>Photo</span>
            </div>
          </div>

          <div className={s.bar}>
            <span>
              Answer <span className={s.barValue}>( Please select your correct option )</span>
            </span>
          </div>

          <ul className={s.options}>
            {OPTIONS.map((option, i) => (
              <li
                key={option}
                className={i === SAVED_OPTION ? `${s.option} ${s.optionSaved}` : s.option}
              >
                <span className={s.radio} />
                {option}
              </li>
            ))}
          </ul>

          <div className={s.controls}>
            <div className={s.clock}>
              <span className={s.clockMinutes}>142</span>
              <span className={s.clockLabel}>
                min
                <br />
                Remaining
              </span>
            </div>
            <div className={s.buttons}>
              {BUTTONS.map((label) => (
                <span key={label} className={label === 'Save' ? `${s.key} ${s.keyPrimary}` : s.key}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className={s.finish}>
            Click here to <strong>FINISH</strong> Your Test
          </div>
        </div>
      </div>
      <figcaption className={s.caption}>Illustration: the simulated exam terminal</figcaption>
    </figure>
  );
}
