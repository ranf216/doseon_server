module.exports = class
{
    constructor(session = null)
    {
        if (session !== null)
        {
            this.$Session = session;
        }
    }

    allow()
    {
        return $UserRoles.allowUserRole(this.$user_id, this.$role);
    }
    
    unallow()
    {
        return $UserRoles.unallowUserRole(this.$user_id, this.$role);
    }
    
    deny()
    {
        return $UserRoles.denyUserRole(this.$user_id, this.$role);
    }
    
    undeny()
    {
        return $UserRoles.undenyUserRole(this.$user_id, this.$role);
    }
    
    get_user_roles()
    {
        return $UserRoles.getUserRoles(this.$user_id);
    }
    
    get_my_roles()
    {
        return $UserRoles.getUserRoles(this.$Session.userId);
    }
}
