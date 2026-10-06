import { type FormEvent, useState } from 'react';
import type { Candidate } from '@/exam/session';
import styles from './cbt.module.css';

/**
 * The terminal's sign-in box ("User:" / "Password:" / Submit). At the centre the
 * credentials come from the admit card; here they are pre-filled for the candidate.
 */
export function CbtLogin({
  candidate,
  onLogin,
}: {
  candidate: Candidate;
  onLogin: (candidate: Candidate) => void;
}) {
  const [user, setUser] = useState(candidate.userId);
  const [password, setPassword] = useState('123456');
  const [message, setMessage] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!user.trim() || !password) {
      setMessage('Please enter User and Password');
      return;
    }
    onLogin({ ...candidate, userId: user.trim() });
  };

  return (
    <div className={styles.loginWrap}>
      <form className={styles.loginBox} onSubmit={submit} aria-label="Candidate login">
        <div className={styles.loginTop} />
        <div className={styles.loginMsg} role="alert">
          {message}
        </div>
        <div className={styles.loginRow}>
          <label htmlFor="cbt-user">User:</label>
          <input
            id="cbt-user"
            value={user}
            onChange={(e) => setUser(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className={styles.loginRow}>
          <label htmlFor="cbt-password">Password:</label>
          <input
            id="cbt-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className={styles.loginSubmit}>
          <button type="submit" className={styles.classicButton} autoFocus>
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
