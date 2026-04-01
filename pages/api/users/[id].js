import { UsersTable, UserLocationRolesTable, formatUser, formatUserLocationRole } from '../../../lib/airtable'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'GET') {
    try {
      const record = await UsersTable.find(id)
      const user = formatUser(record)
      // Attach location roles
      const roleRecords = await UserLocationRolesTable.select({
        filterByFormula: `{UserId} = '${id}'`
      }).all()
      user.locationRoles = roleRecords.map(formatUserLocationRole)
      return res.status(200).json(user)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'PATCH') {
    const { name, username, pin, isAdmin, isGlobalAdmin, email, phone } = req.body
    try {
      const fields = {}
      if (name !== undefined) fields.Name = name
      if (username !== undefined) fields.Username = username
      if (pin !== undefined) fields.PIN = pin
      if (isGlobalAdmin !== undefined) fields.IsGlobalAdmin = isGlobalAdmin
      if (isAdmin !== undefined) fields.IsGlobalAdmin = isAdmin // legacy compat
      if (email !== undefined) fields.Email = email
      if (phone !== undefined) fields.Phone = phone
      const record = await UsersTable.update(id, fields)
      return res.status(200).json(formatUser(record))
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Also remove all location role assignments for this user
      const roleRecords = await UserLocationRolesTable.select({
        filterByFormula: `{UserId} = '${id}'`
      }).all()
      for (const r of roleRecords) {
        await UserLocationRolesTable.destroy(r.id)
      }
      await UsersTable.destroy(id)
      return res.status(200).json({ success: true })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}