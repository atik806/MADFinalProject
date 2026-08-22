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
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const farmerId = req.user.id;
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

//apply for a loan

export const applyForLoan = async (req: Request, res: Response) => {
    try{
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const farmerId = req.user.id;
        const {
            title,
            amount,
            duration,
            purpose,
            installment_type,
            emi,
        } = req.body;
        if(!title || !amount || !duration || !purpose || !installment_type || !emi) {
            return res.status(400).json({ message: 'Missing required fields' });
        }
        const {data, error} = await supabase
            .from('loan_applications')
            .insert({
                farmer_id: farmerId,
                title,
                amount,
                duration,
                purpose,
                installment_type,
                emi,
                status: 'pending',
                application_date: new Date().toISOString(),
            })
            .select()
            .single();
        if(error) {
            return res.status(400).json({ message: 'Failed to apply for loan', error: error.message });
        }

        //create a new loan timeline entry
    await supabase
    .from("loan_timeline")
      .insert([
        {
          loan_application_id: data.id,
          step: 1,
          label: "Application Submitted",
          completed: true,
        },
        {
          loan_application_id: data.id,
          step: 2,
          label: "Under Review",
          completed: false,
        },
        {
          loan_application_id: data.id,
          step: 3,
          label: "Decision",
          completed: false,
        },
      ]);
      await supabase
      .from("notifications")
      .insert({
        user_id: farmerId,
        title: "Loan Application Submitted",
        description:
          "Your loan application has been submitted successfully.",
        read: false,
      });

    return res.status(201).json({
      success: true,
      message:
        "Loan application submitted successfully",
      data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Failed to apply for loan",
    });
  }
};