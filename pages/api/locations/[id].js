import { LocationsTable, formatLocation } from '../../../lib/airtable'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'PATCH') {
    const { name, slug, address, active } = req.body
    try {
      const fields = {}
      if (name !== undefined) fields.Name = name
      if (slug !== undefined) fields.Slug = slug.toLowerCase().replace(/\s+/g, '-')
      if (address !== undefined) fields.Address = address
      if (active !== undefined) fields.Active = active
      const record = await LocationsTable.update(id, fields)
      return res.status(200).json(formatLocation(record))
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Soft delete — mark inactive
      const record = await LocationsTable.update(id, { Active: false })
      return res.status(200).json({ success: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}