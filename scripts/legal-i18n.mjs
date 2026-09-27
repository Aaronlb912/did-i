// Privacy Policy and Terms of Use. Have a lawyer review before you rely on these.
// Merged into locale packs by merge-i18n-additions.mjs.

export const legalEn = {
  'title.privacy': 'Privacy',
  'title.terms': 'Terms',

  'legal.privacyShort': 'Privacy Policy',
  'legal.termsShort': 'Terms of Use',
  'legal.linksLead': 'By continuing you agree to the',
  'legal.linksAnd': ' and ',
  'legal.signInLead': 'By signing in you agree to the',
  'legal.gemLead': 'Purchases follow the',
  'legal.effective': 'Effective {date}.',
  'legal.notLawyer': 'This is plain-language disclosure, not legal advice.',
  'legal.backSettings': 'Settings',
  'legal.date': 'September 26, 2026',
  'legal.emailMissing': ' (set VITE_LEGAL_EMAIL before you ship)',
  'legal.operatorWarn': 'Set VITE_LEGAL_EMAIL in .env.local before other people sign up.',

  'settings.legal': 'Legal',
  'settings.privacy': 'Privacy Policy',
  'settings.terms': 'Terms of Use',

  'legal.privacy.kicker': 'Privacy',
  'legal.privacy.title': 'Privacy Policy',
  'legal.privacy.intro.title': 'Who this is for',
  'legal.privacy.intro.body':
    'Did I ("we", "us") runs this app. This policy explains what we collect, why, and what you can do about it.\n\nQuestions: {email}{emailNote}.',
  'legal.privacy.local.title': 'Without an account',
  'legal.privacy.local.body':
    'You can use Did I on this phone with no sign-in. Your questions, answers, coins, gems, and settings stay in this browser or app unless you turn on an account.\n\nWe do not receive that local data unless you choose to sync or share a copy yourself.',
  'legal.privacy.account.title': 'When you sign in',
  'legal.privacy.account.body':
    'If you create an account with an email code, Sign in with Apple, or Sign in with Google, we store:\n\nYour email address (for sign-in). With Apple or Google it is the address they share with us, which can be a private relay address. We do not get your Apple or Google password.\n\nYour display name and handle.\n\nYour phone number, if you add one. You need one to add friends. We keep it in one standard format, and a number can be on only one account.\n\nA copy of your shelf (folders, questions, answers, shop progress) in our database so you can sync across phones.\n\nDevice rows (a label you choose, platform, last seen time, and a push token if you allow notifications).\n\nProfile preferences such as your equipped look and cheer.',
  'legal.privacy.social.title': 'Friends, family, and sends',
  'legal.privacy.social.body':
    'When you use People features we store friendship requests, family memberships and roles, invite codes you create or redeem, Did I sends you make or receive, and block/report records you file.\n\nFriends find each other by phone number. To ask a friend, you add your own number first. Anyone signed in who types your exact number can find your account and see your display name, so they can send you a request. When you send a request, the person you ask sees your number and display name. We do not show your number to anyone else, we do not let anyone browse numbers, and we do not read your contacts.\n\nInvite links. If you open someone\'s invite link (did-i.app/i/CODE), the page keeps the code in your browser and, when you tap a store button, copies it to your clipboard. The first time the app opens on a new iPhone install, it reads the clipboard once to look for that code; iOS asks before it pastes. On Android the app reads the Google Play install referrer instead. We keep only an invite code and ignore anything else. When you sign in, the code links your account to the person who invited you, and their invite count goes up.\n\nA Did I send from someone in your family goes straight onto your tonight. One from a friend does the same only if you turn on "Can add to my tonight" for that friend. We store that setting on your account. Only you can see or change it, and the friend is not told.\n\nOther people in a family or on your friends list can see what the app is designed to show them (names, streaks you share, family questions, and similar).',
  'legal.privacy.push.title': 'Notifications',
  'legal.privacy.push.body':
    'On Android and iPhone, if you allow notifications, we store a push token tied to your account and device. We use it to deliver friend Did I sends, friend requests, and similar nudges. You can turn notifications off in phone settings.\n\nLocal reminders for due questions stay on the device and do not need an account.',
  'legal.privacy.pay.title': 'Gem purchases',
  'legal.privacy.pay.body':
    'If you buy gem packs, Apple or Google processes payment. We receive your user id, pack id, gem count, and purchase status so we can credit your shelf. We do not store your card number. The store handles payment data under its own privacy policy.',
  'legal.privacy.vendors.title': 'Service providers',
  'legal.privacy.vendors.body':
    'We use Supabase (hosting, database, auth), Google Firebase Cloud Messaging (push on Android and iPhone), Sign in with Apple and Google Sign-In (if you choose them), Expo (delivers app updates; it sees your device type, app version, and IP address), and Apple App Store / Google Play (in-app purchases, install referrer). They process data on our behalf under their terms.\n\nOptional crash reports go only to a URL you configure (VITE_REPORT_URL). We do not run third-party ad trackers in the app.',
  'legal.privacy.use.title': 'How we use data',
  'legal.privacy.use.body':
    'We use your data to run the app: sync your shelf, deliver social features, send pushes you asked for, process purchases, prevent abuse, and fix bugs.\n\nWe do not sell your personal information.',
  'legal.privacy.share.title': 'When we share',
  'legal.privacy.share.body':
    'We share data with service providers listed above, when you direct us to (for example sending a Did I to a friend), when required by law, or to protect safety and rights.\n\nOther users see only what the product shows them (friend names, family questions, streaks you share, and the like).',
  'legal.privacy.retain.title': 'How long we keep it',
  'legal.privacy.retain.body':
    'Local data stays until you clear it or uninstall. Account data stays while your account exists.\n\nPush queue rows clear after sending.\n\nWhen you delete your account we remove your shelf, profile, devices, and auth user through the in-app delete flow.',
  'legal.privacy.rights.title': 'Your choices and rights',
  'legal.privacy.rights.body':
    'Export: Settings can download a JSON copy of this phone. Account has Download my data.\n\nDelete: Account can delete this account, which removes cloud data tied to you.\n\nOpt out: Stay signed out, block people, sign out devices, or disable notifications.\n\nDepending on where you live you may have rights to access, correct, or delete personal data. Email {email} and we will respond within a reasonable time.',
  'legal.privacy.kids.title': 'Children',
  'legal.privacy.kids.body':
    'Did I is a general reminder app, not a children\'s product. We do not knowingly collect personal information from children under 13. If you believe a child under 13 signed up, email {email} and we will delete the account.\n\nFamilies can include a kid role for shared chores. A parent should create and supervise kid use.',
  'legal.privacy.security.title': 'Security',
  'legal.privacy.security.body':
    'We use row-level security, HTTPS, and access controls on the database. No method is perfect. Use a phone lock and do not share your email code.',
  'legal.privacy.intl.title': 'Where data lives',
  'legal.privacy.intl.body':
    'Data is processed in the United States and where our providers operate. If you use Did I from another country, you consent to that transfer.',
  'legal.privacy.changes.title': 'Changes',
  'legal.privacy.changes.body':
    'We may update this policy. The effective date at the top will change. Continued use after an update means you accept the revised policy.',
  'legal.privacy.contact.title': 'Contact',
  'legal.privacy.contact.body': 'Privacy questions and requests: {email}{emailNote}.',

  'legal.terms.kicker': 'Terms',
  'legal.terms.title': 'Terms of Use',
  'legal.terms.intro.title': 'Agreement',
  'legal.terms.intro.body':
    'These Terms are between you and Did I. By using the app you agree to these Terms and the Privacy Policy. If you do not agree, do not use Did I.',
  'legal.terms.eligible.title': 'Age restrictions',
  'legal.terms.eligible.body':
    'Users under the age of 13 must obtain parental consent before using the App.',
  'legal.terms.service.title': 'What Did I is',
  'legal.terms.service.body':
    'Did I is a personal reminder tool. It helps you track habits and questions you choose. It is not a medical device, emergency service, or professional advice. Do not rely on Did I for medication timing, safety-critical checks, or anything where a missed tap could cause harm.\n\nUse your own judgment. Verify important tasks yourself.',
  'legal.terms.content.title': 'Your questions and answers',
  'legal.terms.content.body':
    'You own the content you enter. You grant us a license to store, sync, and display it as the app requires.\n\nYou are responsible for what you write. Do not enter illegal content or someone else\'s private information without permission.',
  'legal.terms.account.title': 'Accounts',
  'legal.terms.account.body':
    'Sign-in uses a one-time email code. Keep your email access secure. You may sign out one device or everywhere, export data, or delete your account in Account settings.\n\nTo add friends you add a phone number. Only add a number that is yours. A number can be on one account at a time. If yours is already taken, contact us.',
  'legal.terms.social.title': 'People features',
  'legal.terms.social.body':
    'Friends, families, sends, and invites are optional. You may block someone; blocking removes friendship and pending nudges on our side. You may report users.\n\nWe may suspend accounts that abuse others or the service.',
  'legal.terms.family.title': 'Families and kid role',
  'legal.terms.family.body':
    'Families share questions among members. Parent and kid roles control who can assign tasks. Did I is not directed at children; parents are responsible for kid accounts they allow on a family.',
  'legal.terms.pay.title': 'Gem purchases',
  'legal.terms.pay.body':
    'Gem packs are digital goods for in-app cheers and looks. Prices are shown before checkout through the App Store or Google Play.\n\nExcept where required by law, gem purchases are final once delivered to your shelf. Chargebacks for valid purchases may lead to account suspension.',
  'legal.terms.rules.title': 'Rules',
  'legal.terms.rules.body':
    'Do not: break the law, harass others, spam invites or sends, attempt to hack the service, scrape other users, impersonate others, or use bots to abuse caps.\n\nDo not reverse engineer the service to bypass paywalls or limits.',
  'legal.terms.end.title': 'Ending use',
  'legal.terms.end.body':
    'You may stop using Did I anytime and delete your account. We may suspend or terminate access if you break these Terms or harm others. Sections that should survive (disclaimers, limits, disputes) survive termination.',
  'legal.terms.warranty.title': 'No warranty',
  'legal.terms.warranty.body':
    'Did I is provided "as is" and "as available" without warranties of any kind, express or implied, including fitness for a particular purpose, accuracy, or non-infringement.',
  'legal.terms.liability.title': 'Limit of liability',
  'legal.terms.liability.body':
    'To the fullest extent allowed by law, Did I is not liable for indirect, incidental, special, consequential, or punitive damages, or for lost data, missed reminders, or harm from relying on the app.\n\nOur total liability for any claim is limited to the greater of fifty US dollars or the amount you paid us in the twelve months before the claim.',
  'legal.terms.indemnify.title': 'Indemnity',
  'legal.terms.indemnify.body':
    'You agree to hold Did I harmless from claims arising out of your use of the app, your content, or your violation of these Terms or someone else\'s rights.',
  'legal.terms.law.title': 'Disputes',
  'legal.terms.law.body':
    'These Terms are governed by the laws of the United States, without regard to conflict-of-law rules.\n\nDisputes should first be emailed to {email}. If we cannot resolve a dispute, courts in the United States have exclusive jurisdiction, unless your local consumer law requires otherwise.',
  'legal.terms.changes.title': 'Changes',
  'legal.terms.changes.body':
    'We may change these Terms. The effective date will update. Continued use after a change means you accept the new Terms.',
  'legal.terms.contact.title': 'Contact',
  'legal.terms.contact.body': 'Questions about these Terms: {email}{emailNote}.',

  'help.legal': 'Legal',
  'help.legalP':
    'Privacy Policy and Terms of Use live in Settings under Legal. Read them before you sign in or buy gems.',
}

export const legalEs = {
  'title.privacy': 'Privacidad',
  'title.terms': 'Términos',

  'legal.privacyShort': 'Política de privacidad',
  'legal.termsShort': 'Términos de uso',
  'legal.linksLead': 'Al continuar aceptas los',
  'legal.linksAnd': ' y la ',
  'legal.signInLead': 'Al iniciar sesión aceptas los',
  'legal.gemLead': 'Las compras siguen los',
  'legal.effective': 'Vigente desde {date}.',
  'legal.notLawyer': 'Esto es información clara, no asesoría legal.',
  'legal.backSettings': 'Ajustes',
  'legal.date': '26 de septiembre de 2026',
  'legal.emailMissing': ' (configura VITE_LEGAL_EMAIL antes de publicar)',
  'legal.operatorWarn': 'Configura VITE_LEGAL_EMAIL en .env.local antes de que otros se registren.',

  'settings.legal': 'Legal',
  'settings.privacy': 'Política de privacidad',
  'settings.terms': 'Términos de uso',

  'legal.privacy.kicker': 'Privacidad',
  'legal.privacy.title': 'Política de privacidad',
  'legal.privacy.intro.title': 'Para quién es',
  'legal.privacy.intro.body':
    'Did I ("nosotros") opera esta app. Esta política explica qué recopilamos, por qué y qué puedes hacer.\n\nPreguntas: {email}{emailNote}.',
  'legal.privacy.local.title': 'Sin cuenta',
  'legal.privacy.local.body':
    'Puedes usar Did I en este teléfono sin iniciar sesión. Tus preguntas, respuestas, monedas, gemas y ajustes quedan en este navegador o app hasta que actives una cuenta.\n\nNo recibimos esos datos locales a menos que sincronices o compartas una copia.',
  'legal.privacy.account.title': 'Con cuenta',
  'legal.privacy.account.body':
    'Si creas cuenta con un código por email, Iniciar sesión con Apple o Iniciar sesión con Google, guardamos:\n\nTu email (para entrar). Con Apple o Google es la dirección que nos comparten, que puede ser una dirección de reenvío privada. No recibimos tu contraseña de Apple o Google.\n\nTu nombre visible y handle.\n\nTu número de teléfono, si lo agregas. Lo necesitas para agregar amigos. Lo guardamos en un formato estándar, y un número solo puede estar en una cuenta.\n\nUna copia de tu estante (carpetas, preguntas, respuestas, progreso de tienda) para sincronizar entre teléfonos.\n\nFilas de dispositivo (nombre que elijas, plataforma, última vez visto, token push si permites avisos).\n\nPreferencias de perfil como look y cheer equipados.',
  'legal.privacy.social.title': 'Amigos, familia y envíos',
  'legal.privacy.social.body':
    'Con Personas guardamos solicitudes de amistad, membresías y roles familiares, códigos de invitación, Did I que envías o recibes, y bloqueos/reportes que hagas.\n\nLos amigos se encuentran por número de teléfono. Para pedir amistad, primero agregas tu número. Cualquier persona con sesión iniciada que escriba tu número exacto puede encontrar tu cuenta y ver tu nombre visible para enviarte una solicitud. Cuando envías una solicitud, la persona a quien se la pides ve tu número y tu nombre visible. No mostramos tu número a nadie más, no dejamos que nadie explore números y no leemos tus contactos.\n\nEnlaces de invitación. Si abres el enlace de invitación de alguien (did-i.app/i/CÓDIGO), la página guarda el código en tu navegador y, al tocar un botón de tienda, lo copia al portapapeles. La primera vez que la app se abre en una instalación nueva de iPhone, lee el portapapeles una vez para buscar ese código; iOS pregunta antes de pegar. En Android la app lee el referente de instalación de Google Play. Solo guardamos un código de invitación e ignoramos todo lo demás. Al iniciar sesión, el código vincula tu cuenta con quien te invitó, y su conteo de invitaciones sube.\n\nUn Did I que te manda alguien de tu familia va directo a tu noche. Uno de un amigo hace lo mismo solo si activas "Puede añadir a mi noche" para ese amigo. Guardamos ese ajuste en tu cuenta. Solo tú puedes verlo o cambiarlo, y al amigo no se le avisa.\n\nOtras personas en tu familia o lista de amigos ven lo que la app muestra por diseño (nombres, rachas compartidas, preguntas familiares, etc.).',
  'legal.privacy.push.title': 'Notificaciones',
  'legal.privacy.push.body':
    'En Android y iPhone, si permites avisos, guardamos un token push ligado a tu cuenta y dispositivo para envíos de amigos, solicitudes y similares. Puedes apagarlos en ajustes del teléfono.\n\nLos recordatorios locales de preguntas due quedan en el dispositivo y no requieren cuenta.',
  'legal.privacy.pay.title': 'Compra de gemas',
  'legal.privacy.pay.body':
    'Si compras packs de gemas, Apple o Google procesa el pago. Recibimos tu id de usuario, id de pack, cantidad de gemas y estado de la compra para acreditar tu estante. No guardamos tu número de tarjeta. La tienda maneja los datos de pago con su propia política.',
  'legal.privacy.vendors.title': 'Proveedores',
  'legal.privacy.vendors.body':
    'Usamos Supabase (hosting, base de datos, auth), Google Firebase Cloud Messaging (push en Android y iPhone), Iniciar sesión con Apple y Google Sign-In (si los eliges), Expo (entrega actualizaciones de la app; ve el tipo de dispositivo, la versión de la app y tu dirección IP) y Apple App Store / Google Play (compras in-app, referente de instalación). Procesan datos por nosotros bajo sus términos.\n\nReportes de fallos opcionales van solo a una URL que configures (VITE_REPORT_URL). No usamos rastreadores de anuncios de terceros en la app.',
  'legal.privacy.use.title': 'Uso de datos',
  'legal.privacy.use.body':
    'Usamos tus datos para operar la app: sincronizar tu estante, funciones sociales, pushes que pidas, compras, prevenir abuso y corregir errores.\n\nNo vendemos tu información personal.',
  'legal.privacy.share.title': 'Cuándo compartimos',
  'legal.privacy.share.body':
    'Compartimos con proveedores listados arriba, cuando tú lo indicas (p. ej. al mandar un Did I a un amigo), cuando la ley lo exige, o para proteger seguridad y derechos.\n\nOtros usuarios solo ven lo que el producto muestra (nombres de amigos, preguntas familiares, rachas que compartes, etc.).',
  'legal.privacy.retain.title': 'Cuánto tiempo',
  'legal.privacy.retain.body':
    'Datos locales quedan hasta que los borres o desinstales. Datos de cuenta mientras exista la cuenta.\n\nFilas de push se limpian al enviar.\n\nAl borrar tu cuenta quitamos estante, perfil, dispositivos y usuario de auth con el flujo en la app.',
  'legal.privacy.rights.title': 'Tus derechos',
  'legal.privacy.rights.body':
    'Exportar: Ajustes puede descargar JSON de este teléfono. Cuenta tiene Descargar mis datos.\n\nBorrar: Cuenta puede eliminar la cuenta y datos en la nube.\n\nOptar fuera: quédate sin sesión, bloquea personas, cierra sesión en dispositivos o desactiva avisos.\n\nSegún tu país puedes tener derechos de acceso, corrección o borrado. Escribe a {email} y responderemos en un plazo razonable.',
  'legal.privacy.kids.title': 'Menores',
  'legal.privacy.kids.body':
    'Did I es una app general de recordatorios, no un producto infantil. No recopilamos a sabiendas datos de menores de 13 años. Si crees que un menor se registró, escribe a {email} y borraremos la cuenta.\n\nLas familias pueden incluir rol kid para tareas compartidas. Un padre debe crear y supervisar ese uso.',
  'legal.privacy.security.title': 'Seguridad',
  'legal.privacy.security.body':
    'Usamos seguridad a nivel de fila, HTTPS y controles de acceso en la base de datos. Ningún método es perfecto. Usa bloqueo del teléfono y no compartas tu código de email.',
  'legal.privacy.intl.title': 'Dónde viven los datos',
  'legal.privacy.intl.body':
    'Los datos se procesan en Estados Unidos y donde operen nuestros proveedores. Si usas Did I desde otro país, aceptas esa transferencia.',
  'legal.privacy.changes.title': 'Cambios',
  'legal.privacy.changes.body':
    'Podemos actualizar esta política. La fecha vigente arriba cambiará. Seguir usando la app tras un cambio significa que aceptas la política revisada.',
  'legal.privacy.contact.title': 'Contacto',
  'legal.privacy.contact.body': 'Privacidad y solicitudes: {email}{emailNote}.',

  'legal.terms.kicker': 'Términos',
  'legal.terms.title': 'Términos de uso',
  'legal.terms.intro.title': 'Acuerdo',
  'legal.terms.intro.body':
    'Estos Términos son entre tú y Did I. Al usar la app aceptas estos Términos y la Política de privacidad. Si no estás de acuerdo, no uses Did I.',
  'legal.terms.eligible.title': 'Restricciones de edad',
  'legal.terms.eligible.body':
    'Los menores de 13 años deben contar con el consentimiento de sus padres antes de usar la app.',
  'legal.terms.service.title': 'Qué es Did I',
  'legal.terms.service.body':
    'Did I es una herramienta personal de recordatorios. No es un dispositivo médico, servicio de emergencia ni asesoría profesional. No confíes en Did I para horarios de medicación, comprobaciones críticas de seguridad ni nada donde un toque perdido cause daño.\n\nUsa tu criterio. Verifica tareas importantes tú mismo.',
  'legal.terms.content.title': 'Tus preguntas y respuestas',
  'legal.terms.content.body':
    'Tú eres dueño del contenido que escribes. Nos concedes licencia para guardarlo, sincronizarlo y mostrarlo como requiera la app.\n\nEres responsable de lo que escribes. No introduzcas contenido ilegal ni datos privados de otros sin permiso.',
  'legal.terms.account.title': 'Cuentas',
  'legal.terms.account.body':
    'El inicio de sesión usa un código único por email. Protege tu email. Puedes cerrar sesión en un dispositivo o en todos, exportar datos o borrar la cuenta en Ajustes de cuenta.\n\nPara agregar amigos agregas un número de teléfono. Agrega solo un número que sea tuyo. Un número puede estar en una sola cuenta a la vez. Si el tuyo ya está en uso, escríbenos.',
  'legal.terms.social.title': 'Personas',
  'legal.terms.social.body':
    'Amigos, familias, envíos e invitaciones son opcionales. Puedes bloquear a alguien; el bloqueo quita amistad y avisos pendientes de nuestro lado. Puedes reportar usuarios.\n\nPodemos suspender cuentas que abusen de otros o del servicio.',
  'legal.terms.family.title': 'Familias y rol kid',
  'legal.terms.family.body':
    'Las familias comparten preguntas entre miembros. Los roles parent y kid controlan quién asigna tareas. Did I no está dirigida a niños; los padres son responsables de cuentas kid en una familia.',
  'legal.terms.pay.title': 'Compra de gemas',
  'legal.terms.pay.body':
    'Los packs de gemas son bienes digitales para cheers y looks. Los precios se muestran antes del checkout en App Store o Google Play.\n\nSalvo ley en contrario, las compras de gemas son finales una vez acreditadas. Contracargos injustificados pueden suspender la cuenta.',
  'legal.terms.rules.title': 'Reglas',
  'legal.terms.rules.body':
    'No: infringir la ley, acosar, spam de invitaciones o envíos, hackear el servicio, raspar usuarios, suplantar identidades ni usar bots para abusar límites.\n\nNo desmontes el servicio para saltar pagos o topes.',
  'legal.terms.end.title': 'Fin del uso',
  'legal.terms.end.body':
    'Puedes dejar de usar Did I y borrar tu cuenta cuando quieras. Podemos suspender acceso si incumples estos Términos o dañas a otros. Las secciones que deban sobrevivir (exenciones, límites, disputas) sobreviven.',
  'legal.terms.warranty.title': 'Sin garantía',
  'legal.terms.warranty.body':
    'Did I se ofrece "tal cual" y "según disponibilidad" sin garantías de ningún tipo, expresas o implícitas, incluida idoneidad para un fin particular, exactitud o no infracción.',
  'legal.terms.liability.title': 'Límite de responsabilidad',
  'legal.terms.liability.body':
    'En la máxima medida permitida por la ley, Did I no responde por daños indirectos, incidentales, especiales, consecuentes o punitivos, ni por datos perdidos, recordatorios fallidos o daño por confiar en la app.\n\nNuestra responsabilidad total por cualquier reclamación se limita al mayor de cincuenta dólares estadounidenses o lo que nos pagaste en los doce meses previos.',
  'legal.terms.indemnify.title': 'Indemnización',
  'legal.terms.indemnify.body':
    'Aceptas mantener indemne a Did I frente a reclamaciones por tu uso de la app, tu contenido o tu violación de estos Términos o derechos de terceros.',
  'legal.terms.law.title': 'Disputas',
  'legal.terms.law.body':
    'Estos Términos se rigen por las leyes de Estados Unidos, sin reglas de conflicto de leyes.\n\nPrimero escribe a {email}. Si no resolvemos, los tribunales de Estados Unidos tienen jurisdicción exclusiva, salvo que la ley de consumo local exija otra cosa.',
  'legal.terms.changes.title': 'Cambios',
  'legal.terms.changes.body':
    'Podemos cambiar estos Términos. La fecha vigente se actualizará. Seguir usando la app tras un cambio significa que aceptas los nuevos Términos.',
  'legal.terms.contact.title': 'Contacto',
  'legal.terms.contact.body': 'Preguntas sobre estos Términos: {email}{emailNote}.',

  'help.legal': 'Legal',
  'help.legalP':
    'Política de privacidad y Términos de uso están en Ajustes, Legal. Léelos antes de iniciar sesión o comprar gemas.',
}
