import { Request, Response } from "express";
import { supabase } from "../config/supabase";




//get all the transactions 


export const getAllTransactions = async (req: Request, res: Response) => {
    try{
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const farmerId = req.user.id;
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('farmer_id', farmerId)
            .order('date', { ascending: false });

        if (error) {
            return res.status(400).json({ message: 'Failed to fetch transactions', error: error.message });
        }

       return res.status(200).json({ 
            success: true,
            message: 'Transactions fetched successfully',
            data: transactions
        });


    }catch(error) {
        console.error('Error fetching transactions:', error);
        return res.status(500).json({ message: 'Failed to fetch transactions' });
    }
}


//get transaction by id


export const getTransactionById = async (req: Request, res: Response) => {
    try{
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const farmerId = req.user.id;
        const transactionId = req.params.id;


        const {data: transaction, error } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .eq('farmer_id', farmerId)
            .single();

        if(error || !transaction) {
            return res.status(404).json({ message: 'Transaction not found', error: error?.message });
        }
        return res.status(200).json({
            success: true,
            message: 'Transaction fetched successfully',
            data: transaction
        });
    }catch(error) {
        console.error('Error fetching transaction:', error);
        return res.status(500).json({ message: 'Failed to fetch transaction' });
    }
};


//create a new transaction
export const createTransaction = async (req: Request, res: Response) => {
    try{
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const farmerId = req.user.id;
        const{title,
        description,
        date,
        amount,
        category,
        } = req.body;

    if(!title || !description || !date || !amount || !category) {
        return res.status(400).json({ message: 'Missing required fields' });
    }
    if(category !== 'income' && category !== 'expense') {
        return res.status(400).json({ message: 'Invalid category. Must be either "income" or "expense"' });
    }


    const {data, error } = await supabase
        .from('transactions')
        .insert({
            farmer_id: farmerId,
            title,
            description,
            date:date || new Date()
            .toISOString()
            .split('T')[0], // Store only the date part
            amount,
            category
        })
        .select()
        .single();

    if(error) {
        return res.status(400).json({ message: 'Failed to create transaction', error: error.message });
    }

    return res.status(201).json({
        success: true,
        message: 'Transaction created successfully',
        data
    });
    } catch (error) {
        console.error('Error creating transaction:', error);
        return res.status(500).json({ message: 'Failed to create transaction' });
    }
}