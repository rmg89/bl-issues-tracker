import { UsersTable, formatUser } from '../../../lib/airtable'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'PATCH') {
    const { name, username, pin, isAdmin, email } = req.body
    try {
      const fields = {}
      if (name !== undefined) fields.Name = name
      if (username !== undefined) fields.Username = username
      if (pin !== undefined) fields.PIN = pin
      if (isAdmin !== undefined) fields.IsAdmin = isAdmin
      if (email !== undefined) fields.Email = email
      const record = await UsersTable.update(id, fields)
      return res.status(200).json(formatUser(record))
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await UsersTable.destroy(id)
      return res.status(200).json({ success: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}