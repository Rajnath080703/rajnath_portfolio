/**
 * Single source of truth for every piece of personal / resume content.
 * Everything rendered on the site (sections, terminal, captions) reads from here.
 *
 * ACCURACY RULE: only resume-supported facts belong in this file.
 * No invented counts, percentages, dates or achievements.
 */

const BASE = import.meta.env.BASE_URL;

export const profile = {
  name: 'Rajnath Tamizh Selvan',
  firstName: 'Rajnath',
  lastName: 'Tamizh Selvan',
  title: 'System Engineer',
  focus: ['Linux', 'Virtualization', 'IT Infrastructure'],
  location: 'Chennai, India',

  // Leave a field empty ('') to hide it everywhere on the site.
  contact: {
    email: 'rajnath080703@gmail.com',
    phone: '+91 87782 36840',
    linkedin: 'https://www.linkedin.com/in/rajnath-t-589bb4391',
  },

  resumeUrl: `${BASE}resume/Rajnath_Tamizh_Selvan_Resume.pdf`,

  summary:
    'Experienced System Engineer with expertise in Linux administration, networking, and IT infrastructure management. Skilled in installing, configuring, and maintaining servers, virtualization platforms, and cloud environments. Proficient in troubleshooting hardware, software, and network issues to ensure high system availability. Experienced in system monitoring, security, backup, and disaster recovery solutions. Passionate about automation, AI integration, and optimizing IT operations. Committed to delivering reliable, secure, and scalable technology solutions.',

  experience: [
    {
      role: 'System Engineer',
      company: 'ABOSS Technologies India (OPC) Private Limited',
      period: '~1.2 years',
      note: 'Client-facing infrastructure and systems administration role',
      groups: [
        {
          title: 'Microsoft 365 & Mail',
          items: ['Microsoft 365 Administration', 'Mailbox & PST Management', 'Email Migration', 'OneDrive Migration'],
        },
        {
          title: 'Virtualization & Servers',
          items: ['Proxmox', 'VMware', 'Hyper-V', 'Windows Server', 'Ubuntu', 'GPU Server Deployment', 'NVIDIA Drivers'],
        },
        {
          title: 'Network & Access',
          items: ['Networking', 'Tailscale VPN', 'Cloudflare DNS/SSL'],
        },
        {
          title: 'Operations',
          items: ['Monitoring', 'Backup & Disaster Recovery', 'Bash', 'PowerShell', 'Technical Documentation', 'Remote Support'],
        },
      ],
      highlights: [
        'Administered Microsoft 365 environments, including user account management, mailbox administration, licensing, and security configurations.',
        'Performed Outlook mailbox backups, PST import/export, and email recovery to ensure data protection and business continuity.',
        'Executed email migrations between Outlook, Microsoft 365, and Google Workspace with minimal downtime, and managed OneDrive data migration, synchronization, and backup.',
        'Installed, configured, and maintained virtualization platforms including Proxmox, VMware, and Hyper-V; deployed and managed Windows and Ubuntu servers for production and testing environments.',
        'Configured Proxmox virtual machines, networking, storage, and backup solutions, and implemented disaster recovery using Wasabi Cloud Storage and other backup technologies.',
        'Diagnosed and resolved hardware, OS, application, and network issues for end users and servers; performed server health monitoring, preventive maintenance, and performance optimization.',
        'Configured and managed Tailscale VPN for secure remote connectivity, and Cloudflare DNS records, domain configurations, SSL certificates, and DNS troubleshooting.',
        'Assisted in GPU server deployment, hardware installation, and NVIDIA driver configuration and troubleshooting.',
        'Configured and troubleshot network services including IP addressing, DNS, DHCP, gateways, VLANs, and routing.',
        'Provided remote technical support using RDP, AnyDesk, RustDesk, and TeamViewer, and automated routine administrative tasks using Bash and PowerShell scripting.',
        'Created and maintained technical documentation, installation guides, SOPs, and infrastructure documentation; collaborated with internal teams to resolve incidents and improve system reliability.',
      ],
    },
    {
      role: 'Assistant Technician',
      company: 'Kaizen Infoserve Pvt. Ltd.',
      client: 'Cognizant',
      period: 'Feb 2023 – May 2024',
      note: 'IT asset and end-user support',
      items: [
        'Managed company IT assets, including desktops, laptops, monitors, and peripherals.',
        'Installed, configured, and troubleshot Windows operating systems and business applications, including Microsoft Office and Visual Studio Code.',
        'Diagnosed and resolved hardware, software, printer, and system-related issues for end users.',
        'Created and managed employee user accounts and provided access to required applications and systems.',
        'Performed system maintenance, software installation, updates, and preventive troubleshooting.',
        'Provided technical support by resolving user incidents and ensuring timely issue resolution while maintaining service quality.',
      ],
    },
  ],

  skills: [
    {
      title: 'Infrastructure & Virtualization',
      items: ['Linux', 'Windows Server', 'Mac OS', 'Proxmox', 'VMware', 'Server Hardware', 'GPU Servers', 'BIOS/UEFI', 'Server Installation & Configuration'],
    },
    {
      title: 'Networking',
      items: ['TCP/IP', 'DNS', 'DHCP', 'Network Diagnostics', 'Wi-Fi Troubleshooting', 'Tailscale Configuration'],
    },
    {
      title: 'Microsoft & Cloud Administration',
      items: [
        'Microsoft 365 Administration',
        'Office 365 Administration',
        'Active Directory',
        'Windows Server Administration',
        'Outlook Mail Backup & PST Management',
        'Google Workspace Data Migration',
        'Microsoft Migration',
      ],
    },
    {
      title: 'Monitoring & Documentation',
      items: ['Grafana', 'Monitoring Scripts', 'SOP Creation', 'Network & System Documentation'],
    },
    {
      title: 'Tools & Support',
      items: ['SSH', 'PowerShell', 'Git', 'Remote Desktop Services', 'Remote Support', 'Microsoft Office'],
    },
  ],

  infrastructure: ['Linux', 'Proxmox', 'VMware', 'Hyper-V', 'Windows Server', 'Networking', 'Monitoring', 'Backup & DR'],

  projects: [
    {
      name: 'Cyber Security Lab Setup',
      place: 'Rathinam College, Coimbatore',
      summary: 'Planned and deployed the Cyber Security Lab infrastructure for hands-on training, built on a Proxmox Virtual Environment.',
      points: [
        'Planned and deployed the Cyber Security Lab infrastructure, configuring servers, networking equipment, and cybersecurity hardware for hands-on training.',
        'Deployed and managed a Proxmox Virtual Environment (PVE) hosting multiple virtual machines with Windows and Linux operating systems for penetration testing, network security, and system administration exercises.',
        'Installed and configured cybersecurity tools and optimized virtualization resources to deliver a stable, secure, high-performance lab environment for academic use.',
      ],
      tags: ['Proxmox VE', 'Windows & Linux VMs', 'Penetration Testing', 'Network Security', 'System Administration'],
    },
    {
      name: 'WayFinder',
      place: 'Smart Campus Navigation System',
      summary: 'Interactive campus navigation application with digital map search and route guidance.',
      points: [
        'Developed an interactive campus navigation application enabling students, faculty, and visitors to locate classrooms, labs, departments, libraries, and hostels via digital map search and route guidance.',
        'Designed the system to improve campus accessibility and reduce time spent finding destinations, focusing on a user-friendly, Google Maps-style navigation experience.',
      ],
      tags: ['Campus Map', 'Destination Search', 'Route Guidance'],
    },
  ],

  certification: ['RHCSA'],
  certificationFull: 'Red Hat Certified System Administrator',

  education: [
    { title: 'Diploma in Computer Science', school: 'Latha Mathavan Polytechnic College' },
    { title: 'SSLC (Class 10)', school: 'St. Michael Matriculation Hr. Sec. School, Madurai' },
  ],

  languages: ['Tamil', 'English'],
};
