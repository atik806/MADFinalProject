import { Request, Response } from "express";
import { supabase } from "../config/supabase";



//get farmer profile



export const getFarmerProfile = async (req: Request, res: Response) => {
    try{
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const userId = req.user.id;
        const {data, error} = await supabase
            .from('farmers')
            .select('*')
            .eq('user_id', userId)
            .single();

        if(error) {
            console.error('Error fetching farmer profile:', error);
            return res.status(500).json({ message: 'Failed to fetch farmer profile' });
        }

        res.status(200).json(data);
    }catch(error) {
        console.error('Error fetching farmer profile:', error);
        res.status(500).json({ message: 'Failed to fetch farmer profile' });
    }
};

//update farmer profile

export const updateProfile = async (req: Request, res: Response) => {
    try{
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const userId = req.user.id;
        const { name, farm_name, location } = req.body;
        const updatedAt = new Date().toISOString();

        const profileData = {
           id : userId,
           ...req.body,
           updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabase
            .from('farmers')
            .upsert(profileData)
            .select()
            .single();
        if(error) {
            console.error('Error updating farmer profile:', error);
            return res.status(500).json({ message: error.message });
        }
        return res.status(200).json({
            success: true,
            message: 'Farmer profile updated successfully',
            data: data,
        });
    }catch(error) {
        console.error('Error updating farmer profile:', error);
        res.status(500).json({ message: 'Failed to update farmer profile' });
    }
}

//farmer dashboard

export const getFarmerDashboard = async (req: Request, res: Response) => {
    try{
        const farmerId = req.user?.id;
        const { data:profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', farmerId)
            .single();
        const {data: transactions } = await supabase
            .from('transactions')
            .select('*')
            .eq('farmer_id', farmerId)
            .order("date", { ascending: false })
            .limit(5);
        const {data: loans } = await supabase
            .from('loan_applications')
            .select('*')
            .eq('farmer_id', farmerId)
            .order("application_date", { ascending: false })
            .limit(5);
        const {count: transactionCount} = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('farmer_id', farmerId);
        const {count: loanCount} = await supabase
            .from('loan_applications')
            .select('*', { count: 'exact', head: true })
            .eq('farmer_id', farmerId);
        return res.status(200).json({
            profile,
            creditScore: profile?.credit_score ?? 0,
            transactions: transactions?? [],
            loans: loans?? [],
            transactionCount: transactionCount ?? 0,
            loanCount: loanCount ?? 0
        });
    }catch(error) {
        console.error('Error fetching farmer dashboard:', error);
        res.status(500).json({ message: 'Failed to fetch farmer dashboard' });
    }
};
