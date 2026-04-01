import { LocationsTable, formatLocation } from '../../../lib/airtable'
export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const records = await LocationsTable.select({ view: 'Grid view' }).all()
      const locations = records.map(formatLocation).filter(l => l.active)
      return res.status(200).json(locations)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    const { name, slug, address } = req.body
    if (!name || !slug) return res.status(400).json({ error: 'Name and slug required' })
    try {
      const record = await LocationsTable.create({
        Name: name,
        Slug: slug.toLowerCase().replace(/\s+/g, '-'),
        Address: address || '',
        Active: true,
      })
      return res.status(200).json(formatLocation(record))
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}