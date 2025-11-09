
import React from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <Link href="/">
          <a>
            <img src="/logo.svg" alt="Library" width={40} height={40} />
          </a>
        </Link>
      </div>

      <nav className={styles.nav}>
        <Link href="/">
          <a>Home</a>
        </Link>

        {loading ? null : session ? (
          <>
            <Link href="/dashboard">
              <a>My Books</a>
            </Link>
            {session.user?.role === 'ADMIN' && (
              <Link href="/admin">
                <a>Admin</a>
              </Link>
            )}
          </>
        ) : (
          <>
            <Link href="/login">
              <a>Login</a>
            </Link>
            <Link href="/signup">
              <a>Sign Up</a>
            </Link>
          </>
        )}
      </nav>

      {session && (
        <div className={styles.userMenu}>
          <span>{session.user?.name ?? session.user?.email}</span>
          <button type="button" onClick={() => signOut()}>
            Logout
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;