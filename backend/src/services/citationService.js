/**
 * DOERA AI — Citation & Reference Formatting Service
 * Supports IEEE, APA 7th, MLA 9th, and Chicago 17th citation formats.
 * Grounded strictly in authentic retrieved metadata. Zero invented DOIs or citations.
 */
class CitationService {
  /**
   * Format author name for APA: "Family, G. M."
   */
  _formatAuthorApa(name) {
    if (!name) return 'Unknown Author';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const family = parts[parts.length - 1];
    const initials = parts.slice(0, -1).map((p) => `${p[0].toUpperCase()}.`).join(' ');
    return `${family}, ${initials}`;
  }

  /**
   * Format author name for IEEE: "G. M. Family"
   */
  _formatAuthorIeee(name) {
    if (!name) return 'Author';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const family = parts[parts.length - 1];
    const initials = parts.slice(0, -1).map((p) => `${p[0].toUpperCase()}.`).join(' ');
    return `${initials} ${family}`;
  }

  /**
   * Format author name for MLA: "Family, Given"
   */
  _formatAuthorMla(name) {
    if (!name) return 'Unknown Author';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const family = parts[parts.length - 1];
    const given = parts.slice(0, -1).join(' ');
    return `${family}, ${given}`;
  }

  /**
   * Generate APA 7th citation
   * Example: Vaswani, A., Shazeer, N., & Parmar, N. (2017). Attention is all you need. arXiv. https://doi.org/...
   */
  formatApa(paper) {
    const authors = Array.isArray(paper.authors) ? paper.authors : [paper.authors || 'Unknown Author'];
    let authorStr = '';

    if (authors.length === 1) {
      authorStr = this._formatAuthorApa(authors[0]);
    } else if (authors.length === 2) {
      authorStr = `${this._formatAuthorApa(authors[0])}, & ${this._formatAuthorApa(authors[1])}`;
    } else if (authors.length > 2) {
      const formatted = authors.slice(0, 3).map((a) => this._formatAuthorApa(a));
      authorStr = `${formatted.join(', ')}, et al.`;
    } else {
      authorStr = 'Unknown Author';
    }

    const year = paper.publishedYear || (paper.publishedDate ? paper.publishedDate.split('-')[0] : 'n.d.');
    const title = paper.title ? paper.title.trim().replace(/\.$/, '') : 'Untitled document';
    const venue = paper.journal || paper.publisher || paper.source || 'Preprint';
    const link = paper.doi ? `https://doi.org/${paper.doi}` : (paper.url || '');

    return `${authorStr} (${year}). ${title}. ${venue}.${link ? ` ${link}` : ''}`;
  }

  /**
   * Generate IEEE citation
   * Example: [1] A. Vaswani, N. Shazeer, and N. Parmar, "Attention is all you need," arXiv preprint arXiv:1706.03762, 2017.
   */
  formatIeee(paper, index = 1) {
    const authors = Array.isArray(paper.authors) ? paper.authors : [paper.authors || 'Author'];
    let authorStr = '';

    if (authors.length === 1) {
      authorStr = this._formatAuthorIeee(authors[0]);
    } else if (authors.length === 2) {
      authorStr = `${this._formatAuthorIeee(authors[0])} and ${this._formatAuthorIeee(authors[1])}`;
    } else if (authors.length > 2) {
      authorStr = `${this._formatAuthorIeee(authors[0])} et al.`;
    } else {
      authorStr = 'Author';
    }

    const year = paper.publishedYear || (paper.publishedDate ? paper.publishedDate.split('-')[0] : 'n.d.');
    const title = paper.title ? paper.title.trim().replace(/["\n]/g, '') : 'Untitled';
    const venue = paper.journal || paper.publisher || paper.source || 'Preprint';
    const link = paper.doi ? ` doi: ${paper.doi}.` : (paper.url ? ` [Online]. Available: ${paper.url}` : '');

    return `[${index}] ${authorStr}, "${title}," ${venue}, ${year}.${link}`;
  }

  /**
   * Generate MLA 9th citation
   * Example: Vaswani, Ashish, et al. "Attention Is All You Need." arXiv, 2017, https://arxiv.org/abs/...
   */
  formatMla(paper) {
    const authors = Array.isArray(paper.authors) ? paper.authors : [paper.authors || 'Unknown Author'];
    let authorStr = '';

    if (authors.length === 1) {
      authorStr = this._formatAuthorMla(authors[0]);
    } else if (authors.length === 2) {
      authorStr = `${this._formatAuthorMla(authors[0])}, and ${authors[1]}`;
    } else if (authors.length > 2) {
      authorStr = `${this._formatAuthorMla(authors[0])}, et al.`;
    } else {
      authorStr = 'Unknown Author';
    }

    const year = paper.publishedYear || (paper.publishedDate ? paper.publishedDate.split('-')[0] : 'n.d.');
    const title = paper.title ? `"${paper.title.trim().replace(/\.$/, '')}."` : '"Untitled."';
    const venue = paper.journal || paper.publisher || paper.source || 'Web publication';
    const link = paper.doi ? `https://doi.org/${paper.doi}` : (paper.url || '');

    return `${authorStr} ${title} ${venue}, ${year}${link ? `, ${link}` : ''}.`;
  }

  /**
   * Generate Chicago 17th citation
   * Example: Vaswani, Ashish, et al. "Attention Is All You Need." arXiv (2017). https://doi.org/...
   */
  formatChicago(paper) {
    const authors = Array.isArray(paper.authors) ? paper.authors : [paper.authors || 'Unknown Author'];
    let authorStr = '';

    if (authors.length === 1) {
      authorStr = this._formatAuthorMla(authors[0]);
    } else if (authors.length === 2) {
      authorStr = `${this._formatAuthorMla(authors[0])}, and ${authors[1]}`;
    } else if (authors.length > 2) {
      authorStr = `${this._formatAuthorMla(authors[0])}, et al.`;
    } else {
      authorStr = 'Unknown Author';
    }

    const year = paper.publishedYear || (paper.publishedDate ? paper.publishedDate.split('-')[0] : 'n.d.');
    const title = paper.title ? `"${paper.title.trim().replace(/\.$/, '')}."` : '"Untitled."';
    const venue = paper.journal || paper.publisher || paper.source || 'Publication';
    const link = paper.doi ? `https://doi.org/${paper.doi}` : (paper.url || '');

    return `${authorStr} ${title} ${venue} (${year})${link ? `. ${link}` : '.'}`;
  }

  /**
   * Format bibliography for a list of papers in the chosen style
   */
  formatBibliography(papers = [], style = 'IEEE') {
    const upperStyle = (style || 'IEEE').toUpperCase();

    const formattedList = papers.map((paper, idx) => {
      let text = '';
      switch (upperStyle) {
        case 'APA':
          text = this.formatApa(paper);
          break;
        case 'MLA':
          text = this.formatMla(paper);
          break;
        case 'CHICAGO':
          text = this.formatChicago(paper);
          break;
        case 'IEEE':
        default:
          text = this.formatIeee(paper, idx + 1);
          break;
      }

      return {
        index: idx + 1,
        paperId: paper.id,
        title: paper.title,
        style: upperStyle,
        citationText: text,
        url: paper.url,
        doi: paper.doi || null,
      };
    });

    const fullBibliographyText = formattedList.map((item) => item.citationText).join('\n\n');

    return {
      style: upperStyle,
      count: formattedList.length,
      citations: formattedList,
      bibliographyText: fullBibliographyText,
    };
  }
}

export const citationService = new CitationService();
export default citationService;
