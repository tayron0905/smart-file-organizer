import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDownUp, ArrowLeft, ArrowRight, Archive, AudioLines, CalendarDays, Check, ChevronDown, ChevronLeft,
  ChevronRight, Clock3, Cloud, Code2, File, FileImage, FileText, Folder, FolderOpen, FolderPlus, Grid2X2,
  HardDrive, Home, Image, LayoutGrid, List, LoaderCircle, Menu, MoreHorizontal, Music2, PackageOpen,
  Play, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles, Tags, Upload, Video, X,
} from 'lucide-react';
import './styles.css';

const GROUPS = {
  Bilder: { exts: ['jpg','jpeg','png','gif','webp','svg','avif','heic','tif','tiff','bmp'], icon: FileImage, color: 'blue' },
  Dokumente: { exts: ['pdf','doc','docx','odt','rtf','txt','md','xls','xlsx','ppt','pptx','csv'], icon: FileText, color: 'amber' },
  Videos: { exts: ['mp4','mov','mkv','webm','avi','m4v'], icon: Video, color: 'violet' },
  Audio: { exts: ['mp3','wav','ogg','flac','m4a','aac'], icon: Music2, color: 'green' },
  Archive: { exts: ['zip','tar','gz','7z','rar','bz2'], icon: Archive, color: 'rose' },
  Code: { exts: ['js','jsx','ts','tsx','css','scss','html','json','py','java','c','cpp','go','rs','php'], icon: Code2, color: 'cyan' },
};
const CATEGORIES = ['Bilder', 'Dokumente', 'Videos', 'Audio', 'Archive', 'Code', 'Sonstiges'];
const HOME_SECTIONS = ['home', 'pictures', 'downloads', 'documents', 'videos', 'music'];
const formatSize = (bytes) => bytes < 1024 ? `${bytes} B` : bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(0)} KB` : bytes < 1024 ** 3 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${(bytes / 1024 ** 3).toFixed(1)} GB`;
const formatDate = (date) => new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
const groupOf = (file) => CATEGORIES.find((category) => GROUPS[category]?.exts.includes(file.extension)) || 'Sonstiges';
const isToday = (date) => new Date(date).toDateString() === new Date().toDateString();
const timeAgo = (date) => {
  const days = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
  if (days === 0) return 'Heute'; if (days === 1) return 'Gestern'; if (days < 7) return `Vor ${days} Tagen`; if (days < 30) return `Vor ${Math.floor(days / 7)} Wochen`; return formatDate(date);
};
const titleCase = (value) => value.slice(0, 1).toUpperCase() + value.slice(1);

function App() {
  const [root, setRoot] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState('overview');
  const [sortBy, setSortBy] = useState('name');
  const [sortMode, setSortMode] = useState('type');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [showOrganize, setShowOrganize] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [toast, setToast] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [favorite, setFavorite] = useState('');

  const refresh = useCallback(async (directory = currentPath) => {
    if (!directory) return;
    setLoading(true);
    try {
      const result = await window.organizer.listFolder(directory);
      setCurrentPath(result.path); setItems(result.items);
    } catch (error) { setToast(error.message || 'Ordner konnte nicht geöffnet werden.'); }
    finally { setLoading(false); }
  }, [currentPath]);

  useEffect(() => {
    (async () => {
      const home = await window.organizer.home();
      setRoot(home); setFavorite(home); await refresh(home);
    })();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!selected || selected.isDirectory) { setPreview(null); return undefined; }
    let active = true;
    window.organizer.previewFile(selected.path).then((result) => { if (active) setPreview(result); }).catch(() => setPreview({ kind: 'file' }));
    return () => { active = false; };
  }, [selected]);

  const files = useMemo(() => items.filter((item) => !item.isDirectory), [items]);
  const visibleItems = useMemo(() => {
    let result = items;
    if (section === 'pictures') result = result.filter((item) => item.isDirectory || groupOf(item) === 'Bilder');
    else if (section === 'downloads') result = result.filter((item) => item.isDirectory || groupOf(item) === 'Dokumente' || groupOf(item) === 'Archive');
    else if (section === 'videos') result = result.filter((item) => item.isDirectory || groupOf(item) === 'Videos');
    else if (section === 'music') result = result.filter((item) => item.isDirectory || groupOf(item) === 'Audio');
    if (search.trim()) result = result.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase()));
    return [...result].sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      if (sortBy === 'size') return b.size - a.size;
      if (sortBy === 'date') return new Date(b.modified) - new Date(a.modified);
      if (sortMode === 'date') return groupOf(a).localeCompare(groupOf(b)) || new Date(b.modified) - new Date(a.modified);
      if (sortMode === 'project') return a.name.split(/[ ._-]/)[0].localeCompare(b.name.split(/[ ._-]/)[0]) || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [items, search, section, sortBy, sortMode]);

  const totalSize = files.reduce((total, item) => total + item.size, 0);
  const latestCount = files.filter((item) => isToday(item.modified)).length;
  const currentLabel = currentPath.split('/').filter(Boolean).pop() || 'Dateien';
  const isHome = currentPath === root;
  const grouped = useMemo(() => CATEGORIES.map((category) => ({ category, count: files.filter((item) => groupOf(item) === category).length })), [files]);
  const goToSection = (name, directory) => {
    setSection(name); setSearch(''); setSelected(null);
    if (directory) refresh(directory);
  };
  const chooseFolder = async () => {
    const folder = await window.organizer.chooseFolder(currentPath || root);
    if (folder) { setRoot(folder); setFavorite(folder); setSection('overview'); setSelected(null); await refresh(folder); }
  };
  const openPreview = (item) => item.isDirectory ? refresh(item.path) : setSelected(item);
  const moveTo = async (item, target) => {
    try {
      const result = await window.organizer.moveFile(item.path, target);
      if (result.moved) { setSelected(null); await refresh(); setToast(`${item.name} verschoben`); }
      else if (result.reason === 'exists') setToast('Am Ziel gibt es bereits eine Datei mit diesem Namen.');
    } catch (error) { setToast(error.message || 'Datei konnte nicht verschoben werden.'); }
  };
  const organize = async () => {
    setOrganizing(true);
    let moved = 0;
    const folders = new Map();
    try {
      for (const item of files) {
        let destinationName;
        if (sortMode === 'date') destinationName = new Date(item.modified).toLocaleDateString('sv-SE').slice(0, 7);
        else if (sortMode === 'project') destinationName = item.name.split(/[ _-]/).filter(Boolean)[0] || 'Sonstiges';
        else destinationName = groupOf(item);
        if (item.name === destinationName) continue;
        const target = `${currentPath}/${destinationName}`;
        if (!folders.has(destinationName)) {
          try { await window.organizer.listFolder(target); } catch { await window.organizer.createFolder(target); }
          folders.set(destinationName, target);
        }
        const result = await window.organizer.moveFile(item.path, target);
        if (result.moved) moved += 1;
      }
      await refresh(); setShowOrganize(false); setToast(moved ? `${moved} ${moved === 1 ? 'Datei' : 'Dateien'} sortiert` : 'Alles ist schon sortiert');
    } catch (error) { setToast(error.message || 'Sortieren nicht möglich.'); await refresh(); }
    finally { setOrganizing(false); }
  };
  const handleDrop = async (event, destination) => {
    event.preventDefault(); setDragOver(false);
    const rawPaths = await window.organizer.pathsForDroppedFiles([...event.dataTransfer.files]);
    if (rawPaths.length) {
      let count = 0;
      for (const source of rawPaths) {
        const entry = items.find((item) => item.path === source);
        const target = destination || currentPath;
        if (entry && entry.path !== target) {
          const result = await window.organizer.moveFile(source, target);
          if (result.moved) count += 1;
        }
      }
      await refresh(); if (count) setToast(`${count} ${count === 1 ? 'Datei' : 'Dateien'} verschoben`);
    }
  };

  return (
    <main className={`app-shell ${selected ? 'has-preview' : ''}`} onDragOver={(event) => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setDragOver(true); } }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDragOver(false); }} onDrop={(event) => handleDrop(event)}>
      <aside className="sidebar">
        <button className="brand" onClick={() => goToSection('overview', root)} aria-label="Zur Übersicht">
          <span className="brand-mark"><LayersMark /></span><span className="brand-copy"><b>sortly</b><small>FILE ORGANIZER</small></span>
        </button>
        <button className="library-select" onClick={chooseFolder}><span><HardDrive size={15} /> Meine Dateien</span><ChevronDown size={15} /></button>
        <div className="nav-label">WORKSPACE</div>
        <nav className="nav-list">
          <NavButton icon={LayoutGrid} label="Übersicht" active={section === 'overview'} onClick={() => goToSection('overview', root)} badge={String(files.length)} />
          <NavButton icon={FolderOpen} label="Alle Dateien" active={section === 'all'} onClick={() => goToSection('all', root)} />
          <NavButton icon={Image} label="Bilder" active={section === 'pictures'} onClick={() => goToSection('pictures', root)} />
          <NavButton icon={Video} label="Videos" active={section === 'videos'} onClick={() => goToSection('videos', root)} />
          <NavButton icon={Music2} label="Audio" active={section === 'music'} onClick={() => goToSection('music', root)} />
          <NavButton icon={FileText} label="Dokumente" active={section === 'downloads'} onClick={() => goToSection('downloads', root)} />
        </nav>
        <div className="nav-label location-label">ORTE <button title="Ordner hinzufügen" onClick={chooseFolder}><Plus size={15} /></button></div>
        <nav className="nav-list location-list">
          <NavButton icon={Home} label="Home" active={currentPath === root && isHome} onClick={() => goToSection('overview', root)} />
          <NavButton icon={Image} label="Pictures" active={currentPath === `${root}/Pictures`} onClick={() => { setSection('all'); refresh(`${root}/Pictures`); }} />
          <NavButton icon={DownloadIcon} label="Downloads" active={currentPath === `${root}/Downloads`} onClick={() => { setSection('all'); refresh(`${root}/Downloads`); }} />
          <NavButton icon={Folder} label="Aktueller Ordner" active={!isHome && !HOME_SECTIONS.some((item) => currentPath.endsWith(`/${item}`))} onClick={() => { setSection('all'); refresh(favorite || root); }} />
        </nav>
        <div className="nav-label tag-label">SAMMLUNGEN</div>
        <nav className="nav-list tag-list">
          <NavButton icon={Sparkles} label="Zuletzt geöffnet" dot="pink" onClick={() => { setSortBy('date'); setSection('all'); refresh(root); }} />
          <NavButton icon={ShieldCheck} label="Wichtig" dot="purple" onClick={() => setToast('Wichtige Dateien lassen sich per Drag & Drop ablegen.')} />
          <NavButton icon={Cloud} label="Cloud Sync" dot="yellow" onClick={() => setToast('Cloud Sync ist für eine spätere Version vorgesehen.')} />
        </nav>
        <div className="sidebar-footer"><span className="avatar">J</span><span className="user-copy"><b>Mein Workspace</b><small>Lokaler Speicher</small></span><button className="icon-button" title="Einstellungen" onClick={() => setToast('Alle Dateien bleiben auf deinem Gerät.')}><Settings2 size={18} /></button></div>
      </aside>

      <section className="main-panel">
        <header className="topbar"><div className="breadcrumb"><button onClick={() => goToSection('overview', root)}>Meine Dateien</button><ChevronRight size={14} /><span>{currentLabel}</span></div><div className="topbar-actions"><span className="privacy-chip"><ShieldCheck size={14} /> 100% lokal</span><button className="top-icon" title="Benachrichtigungen" onClick={() => setToast('Du bist auf dem neuesten Stand.')}><span className="notify-dot" /><Clock3 size={17} /></button><span className="avatar avatar-small">J</span></div></header>
        <div className="content-scroll">
          <div className="page-intro"><div><div className="eyebrow">DEIN DIGITALER ARBEITSPLATZ</div><h1>{section === 'overview' ? 'Guten Tag, Jeff' : titleCase(section === 'all' ? 'Alle Dateien' : section === 'pictures' ? 'Bilder' : section === 'downloads' ? 'Dokumente' : section)}</h1><p>Alles an seinem Platz. Ganz automatisch.</p></div><button className="primary-button" onClick={() => setShowOrganize(true)}><Sparkles size={16} /> Jetzt organisieren</button></div>
          <section className="stats-grid" aria-label="Speicherübersicht">
            <StatCard icon={HardDrive} label="Dateien" value={String(files.length)} note="in diesem Ordner" tone="blue" />
            <StatCard icon={Folder} label="Speicher belegt" value={formatSize(totalSize)} note="von deinem Speicher" tone="purple" />
            <StatCard icon={CalendarDays} label="Heute hinzugefügt" value={String(latestCount)} note={latestCount === 1 ? 'neue Datei' : 'neue Dateien'} tone="green" />
            <StatCard icon={Tags} label="Kategorien" value={String(grouped.filter((group) => group.count > 0).length)} note="automatisch erkannt" tone="amber" />
          </section>
          <section className="category-section"><div className="section-heading"><div><h2>Kategorien</h2><p>Deine Dateien, automatisch sortiert</p></div><button className="subtle-link" onClick={() => setShowOrganize(true)}>Alle organisieren <ArrowRight size={14} /></button></div><div className="category-grid">{grouped.slice(0, 6).map(({ category, count }, index) => { const Icon = GROUPS[category].icon; return <button className={`category-card cat-${GROUPS[category].color}`} key={category} onClick={() => { setSearch(''); setSection(category === 'Bilder' ? 'pictures' : category === 'Videos' ? 'videos' : category === 'Audio' ? 'music' : category === 'Dokumente' ? 'downloads' : 'all'); }}><div className="category-icon"><Icon size={19} /></div><div className="category-copy"><b>{category}</b><span>{count} {count === 1 ? 'Datei' : 'Dateien'}</span></div><div className="category-arrow"><ChevronRight size={15} /></div><span className="category-accent">0{index + 1}</span></button>; })}</div></section>
          <section className="files-section"><div className="section-heading files-heading"><div><h2>{section === 'overview' ? 'Deine Dateien' : currentLabel}</h2><p>{files.length} Dateien <span className="separator">·</span> {formatSize(totalSize)}</p></div><div className="file-controls"><label className="search-field"><Search size={15} /><input aria-label="Dateien suchen" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Suchen..." /><kbd>⌘ K</kbd></label><div className="view-toggle"><button className={viewMode === 'grid' ? 'selected' : ''} title="Rasteransicht" onClick={() => setViewMode('grid')}><Grid2X2 size={15} /></button><button className={viewMode === 'list' ? 'selected' : ''} title="Listenansicht" onClick={() => setViewMode('list')}><List size={16} /></button></div><button className="filter-button" title="Sortierung ändern" onClick={() => setSortMode((mode) => mode === 'type' ? 'date' : mode === 'date' ? 'project' : 'type')}><SlidersHorizontal size={16} /><span>{sortMode === 'type' ? 'Typ' : sortMode === 'date' ? 'Datum' : 'Projekt'}</span><ChevronDown size={13} /></button></div></div>
            {sortMode !== 'type' && <div className="sort-banner"><ArrowDownUp size={13} /> Sortiert nach {sortMode === 'date' ? 'Änderungsdatum' : 'Projektname'} <button onClick={() => setShowOrganize(true)}>Ordner automatisch anlegen <ArrowRight size={13} /></button></div>}
            {loading ? <div className="empty-state"><LoaderCircle className="spin" size={25} /><span>Ordner wird geladen…</span></div> : visibleItems.length === 0 ? <div className="empty-state"><PackageOpen size={28} /><b>{search ? 'Keine Dateien gefunden' : 'Hier ist noch nichts'}</b><span>{search ? 'Versuche einen anderen Suchbegriff.' : 'Füge Dateien hinzu oder wähle einen anderen Ordner.'}</span><button onClick={chooseFolder}>Ordner auswählen</button></div> : <div className={`file-grid ${viewMode === 'list' ? 'list-view' : ''}`}>{visibleItems.slice(0, section === 'overview' ? 12 : 160).map((item) => <FileCard key={item.path} item={item} selected={selected?.path === item.path} onClick={() => openPreview(item)} onDoubleClick={() => item.isDirectory ? refresh(item.path) : window.organizer.openPath(item.path)} onDragStart={(event) => event.dataTransfer.setData('text/plain', item.path)} onDrop={(event) => item.isDirectory && handleDrop(event, item.path)} />)}</div>}
          </section>
          <footer className="page-footer"><span><span className="live-dot" /> Alles aktuell</span><span>Deine Dateien verlassen niemals dein Gerät <ShieldCheck size={13} /></span></footer>
        </div>
      </section>

      {selected && <aside className="preview-panel"><div className="preview-top"><span>VORSCHAU</span><button className="icon-button" onClick={() => setSelected(null)} title="Schließen"><X size={17} /></button></div><div className="preview-stage">{preview?.kind === 'image' ? <img src={preview.url} alt={selected.name} /> : preview?.kind === 'video' ? <video src={preview.url} controls /> : preview?.kind === 'audio' ? <div className="media-preview"><Music2 size={34} /><audio src={preview.url} controls /></div> : preview?.kind === 'text' ? <pre className="text-preview">{preview.text}</pre> : <FileIllustration item={selected} large />}</div><div className="preview-info"><div className="preview-category">{groupOf(selected)} <span>·</span> {selected.extension ? `.${selected.extension}` : 'Datei'}</div><h3 title={selected.name}>{selected.name}</h3><div className="file-metadata"><MetaRow icon={HardDrive} label="Größe" value={formatSize(selected.size)} /><MetaRow icon={CalendarDays} label="Geändert" value={formatDate(selected.modified)} /><MetaRow icon={Folder} label="Speicherort" value={currentLabel} /></div><button className="open-file-button" onClick={() => window.organizer.openPath(selected.path)}><ArrowRight size={15} /> In App öffnen</button></div></aside>}

      {showOrganize && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowOrganize(false); }}><section className="organize-modal"><div className="modal-top"><div className="modal-icon"><Sparkles size={20} /></div><button className="icon-button" onClick={() => setShowOrganize(false)} title="Schließen"><X size={18} /></button></div><h2>Dateien organisieren</h2><p>Wähle, wie deine Dateien sortiert und in Ordner verschoben werden. Deine Dateien bleiben auf diesem Gerät.</p><div className="organize-options">{[['type', 'Nach Dateityp', 'Bilder, Dokumente, Videos und mehr', Grid2X2], ['date', 'Nach Datum', 'Ordner nach Monat, zum Beispiel 2026-03', CalendarDays], ['project', 'Nach Projekt', 'Ordner nach erstem Wort im Dateinamen', Folder]].map(([value, title, description, Icon]) => <button className={`organize-option ${sortMode === value ? 'active' : ''}`} key={value} onClick={() => setSortMode(value)}><span className="option-icon"><Icon size={17} /></span><span><b>{title}</b><small>{description}</small></span><span className="radio"><span /></span></button>)}</div><div className="modal-foot"><span>{files.length} Dateien in <b>{currentLabel}</b></span><button className="primary-button" onClick={organize} disabled={organizing || files.length === 0}>{organizing ? <><LoaderCircle className="spin" size={15} /> Wird sortiert…</> : <><Sparkles size={15} /> Sortierung starten</>}</button></div></section></div>}
      {dragOver && <div className="drop-overlay"><div className="drop-message"><Upload size={23} /><b>Dateien hier ablegen</b><span>Sie werden in diesen Ordner verschoben</span></div></div>}
      {toast && <div className="toast"><Check size={15} />{toast}<button onClick={() => setToast('')} aria-label="Schließen"><X size={14} /></button></div>}
    </main>
  );
}

function NavButton({ icon: Icon, label, active, badge, dot, onClick }) { return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}><Icon size={16} /><span>{label}</span>{badge && <small>{badge}</small>}{dot && <i className={`nav-dot ${dot}`} />}</button>; }
function StatCard({ icon: Icon, label, value, note, tone }) { return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={17} /></div><span className="stat-label">{label}</span><b>{value}</b><small>{note}</small></article>; }
function FileCard({ item, selected, onClick, onDoubleClick, onDragStart, onDrop }) {
  const category = groupOf(item); const Icon = item.isDirectory ? Folder : GROUPS[category]?.icon || File;
  const color = item.isDirectory ? 'folder' : GROUPS[category]?.color || 'slate';
  return <article className={`file-card ${selected ? 'selected' : ''}`} draggable={!item.isDirectory} onDragStart={onDragStart} onDragOver={(event) => { if (item.isDirectory) event.preventDefault(); }} onDrop={onDrop} onClick={onClick} onDoubleClick={onDoubleClick}>
    <div className="file-card-top"><span className={`file-icon ${color}`}><Icon size={20} /></span><button className="file-menu" onClick={(event) => { event.stopPropagation(); onClick(); }} title="Details anzeigen"><MoreHorizontal size={17} /></button></div>
    <b className="file-name" title={item.name}>{item.name}</b><div className="file-card-meta"><span>{item.isDirectory ? 'Ordner' : formatSize(item.size)}</span><span className="meta-dot">·</span><span>{timeAgo(item.modified)}</span></div>
    {!item.isDirectory && <span className={`file-type-pill ${color}`}>{item.extension || 'DATEI'}</span>}
  </article>;
}
function FileIllustration({ item, large }) { const category = groupOf(item); const Icon = item.isDirectory ? Folder : GROUPS[category]?.icon || File; return <div className={`file-illustration ${large ? 'large' : ''} ${item.isDirectory ? 'folder-art' : `art-${GROUPS[category]?.color || 'slate'}`}`}><Icon size={large ? 48 : 24} /><span>{item.extension?.toUpperCase() || 'ORDNER'}</span></div>; }
function MetaRow({ icon: Icon, label, value }) { return <div className="meta-row"><span><Icon size={14} />{label}</span><b title={value}>{value}</b></div>; }
function DownloadIcon(props) { return <FolderOpen {...props} />; }
function LayersMark() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Z" fill="currentColor" opacity=".9"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
