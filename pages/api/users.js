import { UsersTable, UserLocationRolesTable, formatUser, formatUserLocationRole } from '../../lib/airtable'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { withRoles } = req.query
    try {
      const records = await UsersTable.select({ view: 'Grid view' }).all()
      let users = records.map(formatUser)

      if (withRoles === '1') {
        // Attach location roles to each user
        const roleRecords = await UserLocationRolesTable.select().all()
        const roles = roleRecords.map(formatUserLocationRole)
        users = users.map(u => ({
          ...u,
          locationRoles: roles.filter(r => r.userId === u.id),
        }))
      }

      return res.status(200).json(users)
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'POST') {
    const { name, username, pin, isAdmin, isGlobalAdmin, email, phone } = req.body
    try {
      const record = await UsersTable.create({
        Name: name,
        Username: username,
        PIN: pin,
        IsGlobalAdmin: isGlobalAdmin || isAdmin || false,
        Email: email || '',
        Phone: phone || '',
      })
      return res.status(200).json(formatUser(record))
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}