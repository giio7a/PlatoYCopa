import Handlebars from "handlebars"

// Create a sections object to store our sections
const sections = {}

export function registerHelpers(hbs) {
  // Section helper
  hbs.registerHelper('section', function(name, options) {
    if (!sections[name]) {
      sections[name] = []
    }
    
    sections[name].push(options.fn(this))
    return null
  })

  // Get section helper
  hbs.registerHelper('getSection', function(name) {
    if (!sections[name]) {
      return ''
    }
    
    return new Handlebars.SafeString(sections[name].join('\n'))
  })

  // Clear sections after rendering
  hbs.registerHelper('clearSections', function() {
    for (const key in sections) {
      delete sections[key]
    }
    return ''
  })

  // Helper to safely output HTML content
  hbs.registerHelper('safeHTML', function(content) {
    return new Handlebars.SafeString(content)
  })

  // Helper to repeat something n times
  hbs.registerHelper('times', function(n, block) {
    let accum = ''
    for (let i = 0; i < n; ++i) {
      accum += block.fn(i)
    }
    return accum
  })

  // Helper to subtract numbers
  hbs.registerHelper('subtract', function(a, b) {
    return a - b
  })

  // Helper to check equality
  hbs.registerHelper('eq', function(a, b) {
    return a === b
  })

  // Helper to get modulo
  hbs.registerHelper('mod', function(a, b) {
    return a % b
  })

  // Helper para obtener la fecha actual en formato YYYY-MM-DD
  hbs.registerHelper('currentDate', function() {
    const today = new Date()
    return today.toISOString().split('T')[0]
  })
}