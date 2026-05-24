import { ArrowLeft, Download, ExternalLink, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import offerText from '../JustParser - Публичная оферта.txt?raw';
import cookieText from '../JustRouter - Политика Cookie.txt?raw';
import consentText from '../JustRouter - Согласие на обработку персональных данных.txt?raw';
import privacyPdfUrl from '../JustRouter - Политика конфиденциальности.pdf?url';

const LEGAL_DOCS = {
  offer: {
    title: 'Публичная оферта',
    subtitle: 'Договор возмездного оказания услуг доступа к сервису JustRouter',
    type: 'text',
    content: offerText,
  },
  privacy: {
    title: 'Политика конфиденциальности',
    subtitle: 'Порядок обработки персональных данных и иных данных сервиса JustRouter',
    type: 'pdf',
    url: privacyPdfUrl,
  },
  cookies: {
    title: 'Политика Cookie',
    subtitle: 'Порядок использования cookie и иных технологий сбора технической информации',
    type: 'text',
    content: cookieText,
  },
  'personal-data-consent': {
    title: 'Согласие на обработку персональных данных',
    subtitle: 'Условия предоставления согласия пользователем сервиса JustRouter',
    type: 'text',
    content: consentText,
  },
};

const LEGAL_LINKS = [
  { slug: 'offer', label: 'Публичная оферта' },
  { slug: 'privacy', label: 'Политика конфиденциальности' },
  { slug: 'cookies', label: 'Политика Cookie' },
  { slug: 'personal-data-consent', label: 'Согласие на обработку персональных данных' },
];

const pageBg = 'var(--page-bg)';
const softPanelBg = 'var(--soft-panel-bg)';

function LegalDocumentCard({ doc }) {
  if (doc.type === 'pdf') {
    return (
      <div className="space-y-4">
        <div
          className="rounded-2xl overflow-hidden min-h-[70vh]"
          style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: softPanelBg }}
        >
          <iframe
            src={doc.url}
            title={doc.title}
            className="w-full h-[70vh]"
            style={{ border: 0, backgroundColor: '#fff' }}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href={doc.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm text-white/80 hover:text-white transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <ExternalLink size={14} />
            Открыть PDF
          </a>
          <a
            href={doc.url}
            download
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm text-black bg-white hover:opacity-80 transition-opacity"
          >
            <Download size={14} />
            Скачать PDF
          </a>
        </div>
      </div>
    );
  }

  return (
    <article
      className="rounded-2xl p-5 sm:p-8 text-white/75 text-sm sm:text-base leading-7 whitespace-pre-wrap"
      style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: softPanelBg }}
    >
      {doc.content}
    </article>
  );
}

export default function LegalPage({ documentSlug }) {
  const navigate = useNavigate();
  const doc = documentSlug ? LEGAL_DOCS[documentSlug] : null;

  if (!doc) {
    return (
      <div className="min-h-screen px-5 py-6 sm:px-8" style={{ backgroundColor: pageBg }}>
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors mb-10 cursor-pointer"
          >
            <ArrowLeft size={16} />
            На главную
          </button>

          <div className="mb-8">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
              style={{ backgroundColor: softPanelBg, color: 'var(--milk-muted)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <FileText size={12} />
              Legal
            </div>
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white">
              Правовые документы
            </h1>
            <p className="mt-4 text-white/40 text-sm sm:text-base leading-relaxed max-w-2xl">
              Документы, регулирующие использование сервиса JustRouter, обработку данных и применение cookie.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {LEGAL_LINKS.map((item) => (
              <Link
                key={item.slug}
                to={`/legal/${item.slug}`}
                className="group rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
                style={{ border: '1px solid rgba(255,255,255,0.08)', backgroundColor: softPanelBg }}
              >
                <FileText size={18} className="text-white/30 mb-4 group-hover:text-white/60 transition-colors" />
                <h2 className="text-white text-base font-semibold">{item.label}</h2>
                <p className="mt-2 text-white/35 text-sm">Открыть документ</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-6 sm:px-8" style={{ backgroundColor: pageBg }}>
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => navigate('/legal')}
          className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm transition-colors mb-10 cursor-pointer"
        >
          <ArrowLeft size={16} />
          Все документы
        </button>

        <header className="mb-8">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ backgroundColor: softPanelBg, color: 'var(--milk-muted)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <FileText size={12} />
            Legal
          </div>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white">
            {doc.title}
          </h1>
          <p className="mt-4 text-white/40 text-sm sm:text-base leading-relaxed max-w-3xl">
            {doc.subtitle}
          </p>
        </header>

        <LegalDocumentCard doc={doc} />
      </div>
    </div>
  );
}
