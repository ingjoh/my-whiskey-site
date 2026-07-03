import re

with open("src/components/builder/BuilderRightPanel.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports
content = content.replace("import { getAllPages } from '@/lib/db';", "import { getAllPagesWithMetadata } from '@/lib/db';")

# 2. Add UrlSelector component before export default function BuilderRightPanel
url_selector = """
const UrlSelector = ({ value, onChange, placeholder, availablePages }: { value: string | undefined, onChange: (val: string) => void, placeholder?: string, availablePages: { id: string, title: string }[] }) => {
  const isPredefinedUrl = (url: string) => {
    return ['/', ...availablePages.map(p => `/${p.id}`)].includes(url);
  };
  const isCustom = !isPredefinedUrl(value || '');

  // We need inputStyle here for UrlSelector so it matches other inputs
  const inputStyle = {
    padding: '0.5rem', 
    borderRadius: 'var(--radius-sm)', 
    border: '1px solid var(--color-border)', 
    background: 'var(--color-surface)', 
    color: 'var(--color-foreground)',
    outline: 'none',
    fontSize: '0.875rem'
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
      <select
        value={isCustom ? 'custom' : (value || '')}
        onChange={e => {
          const val = e.target.value;
          onChange(val === 'custom' ? '' : val);
        }}
        style={{ ...inputStyle, flex: isCustom ? '0 0 auto' : 1, width: isCustom ? '140px' : 'auto' }}
      >
        <option value="" disabled>-- Select Page --</option>
        <option value="/">Home (/)</option>
        {availablePages.map(p => (
          <option key={p.id} value={`/${p.id}`}>{p.title} (/{p.id})</option>
        ))}
        <option value="custom">Custom URL...</option>
      </select>
      
      {isCustom && (
        <input 
          type="text" 
          placeholder={placeholder || "https://..."}
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          style={{ ...inputStyle, flex: 1, minWidth: 0, fontFamily: 'monospace' }}
        />
      )}
    </div>
  );
};

export default function BuilderRightPanel"""

content = content.replace("export default function BuilderRightPanel", url_selector)

# 3. Update availablePages state definition
content = content.replace("const [availablePages, setAvailablePages] = useState<string[]>([]);", "const [availablePages, setAvailablePages] = useState<{id: string, title: string}[]>([]);")
content = content.replace("getAllPages().then(setAvailablePages);", "getAllPagesWithMetadata().then(setAvailablePages);")

# 4. Replace individual input fields. 

pattern_buttonLink = r'<input type="text" (placeholder="[^"]*" )?value=\{selectedNode\.props\.buttonLink \|\| \'\'\} onChange=\{\(e\) => updateNodeProps\(selectedNodeId, \{ buttonLink: e\.target\.value \}\)\} style=\{inputStyle\} />'
content = re.sub(pattern_buttonLink, r'<UrlSelector value={selectedNode.props.buttonLink} onChange={(val) => updateNodeProps(selectedNodeId, { buttonLink: val })} availablePages={availablePages} \1/>', content)

pattern_primaryButtonLink = r'<input type="text" (placeholder="[^"]*" )?value=\{selectedNode\.props\.primaryButtonLink \|\| \'\'\} onChange=\{\(e\) => updateNodeProps\(selectedNodeId, \{ primaryButtonLink: e\.target\.value \}\)\} style=\{inputStyle\} />'
content = re.sub(pattern_primaryButtonLink, r'<UrlSelector value={selectedNode.props.primaryButtonLink} onChange={(val) => updateNodeProps(selectedNodeId, { primaryButtonLink: val })} availablePages={availablePages} \1/>', content)

pattern_secondaryButtonLink = r'<input type="text" (placeholder="[^"]*" )?value=\{selectedNode\.props\.secondaryButtonLink \|\| \'\'\} onChange=\{\(e\) => updateNodeProps\(selectedNodeId, \{ secondaryButtonLink: e\.target\.value \}\)\} style=\{inputStyle\} />'
content = re.sub(pattern_secondaryButtonLink, r'<UrlSelector value={selectedNode.props.secondaryButtonLink} onChange={(val) => updateNodeProps(selectedNodeId, { secondaryButtonLink: val })} availablePages={availablePages} \1/>', content)

pattern_linkUrl = r'<input type="text" (placeholder="[^"]*" )?value=\{selectedNode\.props\.linkUrl \|\| \'\'\} onChange=\{\(e\) => updateNodeProps\(selectedNodeId, \{ linkUrl: e\.target\.value \}\)\} style=\{inputStyle\} />'
content = re.sub(pattern_linkUrl, r'<UrlSelector value={selectedNode.props.linkUrl} onChange={(val) => updateNodeProps(selectedNodeId, { linkUrl: val })} availablePages={availablePages} \1/>', content)

pattern_card_linkUrl = r'<input type="text" placeholder="Link URL" value=\{card\.linkUrl \|\| \'\'\} onChange=\{\(e\) => \{ const cards = \[\.\.\.\(selectedNode\.props\.cards \|\| \[\]\)\]; cards\[idx\] = \{ \.\.\.cards\[idx\], linkUrl: e\.target\.value \}; updateNodeProps\(selectedNodeId, \{ cards \}\); \}\} style=\{inputStyle\} />'
content = re.sub(pattern_card_linkUrl, r'<UrlSelector placeholder="Link URL " value={card.linkUrl} onChange={(val) => { const cards = [...(selectedNode.props.cards || [])]; cards[idx] = { ...cards[idx], linkUrl: val }; updateNodeProps(selectedNodeId, { cards }); }} availablePages={availablePages} />', content)

with open("src/components/builder/BuilderRightPanel.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
