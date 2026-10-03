const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// List users (admin only)
exports.listUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build query dynamically based on filters
    let query = `
      SELECT 
        id, username, email, is_active, created_at,
        (SELECT COUNT(*) FROM users) as total_count
      FROM users
      WHERE 1=1
    `;
    
    const conditions = [];
    const values = [];
    
    if (search) {
      conditions.push('(username ILIKE $1 OR email ILIKE $1)');
      values.push(`%${search}%`);
    }
    
    if (status && status !== 'all') {
      conditions.push('is_active = $1');
      values.push(status === 'true' ? true : false);
    }
    
    if (conditions.length > 0) {
      query += ` AND ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, values);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.rows[0]?.total_count || 0,
        pages: Math.ceil((result.rows[0]?.total_count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Get user details
exports.getUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Update user profile
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, bio, avatar_url } = req.body;
    
    // Check if user is trying to change their own username/email
    if (id !== req.user.userId) {
      return res.status(403).json({ 
        success: false, 
        error: 'You can only update your own profile' 
      });
    }
    
    const result = await pool.query(
      `UPDATE users
       SET username = COALESCE($1, username),
           email = COALESCE($2, email),
           bio = COALESCE($3, bio),
           avatar_url = COALESCE($4, avatar_url)
       WHERE id = $5
       RETURNING id, username, email, bio, avatar_url, created_at`,
      [username, email, bio, avatar_url, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// Delete user (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (id === req.user.userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'You cannot delete your own account' 
      });
    }
    
    const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      message: 'User deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
