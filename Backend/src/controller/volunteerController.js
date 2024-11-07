const pool = require('../config/supabaseClient');

const getVolunteers = async (req, res) => {
    try {
        const { data, error } = await pool
            .from('volunteer')
            .select(`*,
                shift_prefer(shift(day,time)),
                task_prefer(task_type(type_name)),
                User(email)
                `);

        if (error) {
            throw error;
        }
        
        res.status(200).json(data);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

const updateVolunteerStatus = async (req, res) => {
    const { id } = req.params;

    // Update the "new" attribute to false
    const { data, error } = await pool
        .from('volunteer')
        .update({ new: false }) // Update the "new" attribute
        .eq('id', id); // Find the volunteer by id

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({ data });
};

const getNewVolunteersCount = async (req, res) => {
    try {
        const { data, error } = await pool
            .from('volunteer')
            .select('id', { count: 'exact' })
            .eq('new', true);

        if (error) {
            throw error;
        }

        res.status(200).json({ count: data.length }); // Send back the count
    } catch (error) {
        console.error('Error fetching new volunteers count:', error);
        res.status(500).json({ error: 'Error fetching new volunteers count' });
    }
};

// Assume this is in your Express.js backend route handler file
const updateVolunteer = async (req, res) => {
    const volunteerId = req.params.id;
    const { volunteerData, schedulePreferences, taskPreferences } = req.body;

    try {
        // Update volunteer's basic information
        const { data: volunteerUpdate, error: volunteerError } = await supabase
            .from('volunteer')
            .update({
                first_name: volunteerData.first_name,
                last_name: volunteerData.last_name,
                phone: volunteerData.phone,
                email: volunteerData.email
            })
            .eq('id', volunteerId);

        if (volunteerError) throw new Error(`Volunteer update failed: ${volunteerError.message}`);

        // Update schedule preferences (shift_prefer table)
        await supabase
            .from('shift_prefer')
            .delete()
            .eq('volunteer_id', volunteerId);

        const scheduleUpdates = schedulePreferences.map(pref => ({
            volunteer_id: volunteerId,
            shift_id: pref.shift_id, // Assuming shift_id is passed from the frontend as part of the preference data
        }));

        const { error: scheduleError } = await supabase
            .from('shift_prefer')
            .insert(scheduleUpdates);

        if (scheduleError) throw new Error(`Schedule preferences update failed: ${scheduleError.message}`);

        // Update task preferences (task_prefer table)
        await supabase
            .from('task_prefer')
            .delete()
            .eq('volunteer_id', volunteerId);

        const taskUpdates = taskPreferences.map(pref => ({
            volunteer_id: volunteerId,
            task_type_id: pref.task_type_id, // Using task_type_id based on your schema
        }));

        const { error: taskError } = await supabase
            .from('task_prefer')
            .insert(taskUpdates);

        if (taskError) throw new Error(`Task preferences update failed: ${taskError.message}`);

        res.status(200).json({ message: 'Volunteer updated successfully' });
    } catch (error) {
        console.error('Error updating volunteer:', error);
        res.status(500).json({ error: error.message });
    }
};



// Fetch schedule preferences from the 'shift' table
const getSchedulePreferences = async (req, res) => {
    try {
        const { data, error } = await pool
            .from('shift')
            .select('day, time'); // Supabase query to select specific columns

        if (error) throw error; // Handle error from Supabase

        const scheduleOptions = data.map(shift => ({
            day: shift.day,
            time: shift.time,
        }));

        res.status(200).json(scheduleOptions);
    } catch (error) {
        console.error("Error fetching schedule preferences:", error.message);
        res.status(500).json({ error: "Failed to fetch schedule preferences." });
    }
};


// Fetch task preferences from the 'task_type' table
const getTaskOptions = async (req, res) => {
    try {
        const { data, error } = await pool
            .from('task_type')
            .select('id, type_name'); // Ensure to select both id and type_name

        if (error) throw error; // Handle error from Supabase

        const taskOptions = data.map(task => ({
            id: task.id,
            type_name: task.type_name,
        }));
        
        res.status(200).json(taskOptions);
    } catch (error) {
        console.error("Error fetching task options:", error.message);
        res.status(500).json({ error: "Failed to fetch task options." });
    }
};



   
module.exports = { 
    getVolunteers,
    updateVolunteerStatus,
    getNewVolunteersCount,
    updateVolunteer,
    getSchedulePreferences,
    getTaskOptions,
};

