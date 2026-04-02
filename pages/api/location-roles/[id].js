import { UserLocationRolesTable, formatUserLocationRole } from '../../../lib/airtable'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'PATCH') {
    const { role } = req.body
    try {
      const record = await UserLocationRolesTable.update(id, { Role: role })
      return res.status(200).json(formatUserLocationRole(record))
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await UserLocationRolesTable.destroy(id)
      return res.status(200).json({ success: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}