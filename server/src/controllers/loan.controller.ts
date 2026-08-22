import { Request, Response } from "express";
import { supabase } from "../config/supabase";

//get farmer loans
export const getLoans = async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const farmerId = req.user.id;
        const { data: loans, error } = await supabase
            .from('loan_applications')
            .select('*')
            .eq('farmer_id', farmerId)
            .order('application_date', { ascending: false });

        if (error) {
            return res.status(400).json({ message: 'Failed to fetch loans', error: error.message });
        }
        return res.status(200).json({
            success: true,
            message: 'Loans fetched successfully',
            data: loans
        });
    } catch (error) {
        console.error('Error fetching loans:', error);
        return res.status(500).json({ message: 'Failed to fetch loans' });
    }
};


//get loan by id

export const getLoanById = async (req: Request, res: Response) => {
    try{
        const farmerId = req.user?.id;
        const loanId = req.params.id;
        const {data, error} = await supabase
            .from('loan_applications')
            .select(`
                 *,
                 loan_timeline (*)
                 `)
            .eq('id', loanId)
            .eq('farmer_id', farmerId)
            .single();
        if(error || !data) {
            return res.status(404).json({ message: 'Loan not found', error: error?.message });
        }
        return res.status(200).json({
            success: true,
            message: 'Loan fetched successfully',
            data: data
        });
    }catch(error) {
        console.error('Error fetching loan:', error);
        return res.status(500).json({ message: 'Failed to fetch loan' });
    }
};

