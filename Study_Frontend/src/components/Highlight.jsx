const Highlight = ({ text, query }) => {
  if (!query?.trim() || !text) return text;
  const idx = String(text).toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  const str = String(text);
  return <>{str.slice(0, idx)}<mark className="search-highlight">{str.slice(idx, idx + query.length)}</mark>{str.slice(idx + query.length)}</>;
};

export default Highlight;
