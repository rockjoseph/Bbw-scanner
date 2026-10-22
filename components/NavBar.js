import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from '../styles/NavBar.module.css';

const LINKS = [
  { href: '/scan', label: '📷 Scan' },
  { href: '/', label: '📋 Catalog' }
];

export default function NavBar() {
  const { pathname } = useRouter();

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.brand}>🛁 BBW Inventory</Link>
      <div className={styles.links}>
        {LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.link} ${pathname === link.href ? styles.active : ''}`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
