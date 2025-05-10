const logger= require('../services/logging.winston.js')


exports.CalculateSalary= async (req, res, next)=>{
    try{
        let { SALARY } = req.body
        SALARY = Number(SALARY)

            if (!SALARY || SALARY <=0 ) {
                return res.status(400).json({ success: false, message: "Please provide a valid salary field." });
            }

        SALARY= SALARY/12;
        const PERCENTAGES = {  BASIC: 45, HRA: 50, SA: 13.5, GRATUITY: 11, PF: 12, RB: 15, IP: 0.5 }

        const calculatePercentage = async (percentage, salary) => parseFloat(((percentage / 100) * salary).toFixed(2))

        let BASIC = await calculatePercentage(PERCENTAGES.BASIC, SALARY)
        let HRA = await calculatePercentage(PERCENTAGES.HRA, BASIC)
        let GRATUITY = 1499.00               
        let PF = 1800.00                      
        let IP = await calculatePercentage(PERCENTAGES.IP, SALARY)
    
        let SA =  parseFloat(SALARY- (BASIC + HRA + GRATUITY + PF + IP))                
        let GS = parseFloat(BASIC + HRA + SA)
        let RB = parseFloat(GRATUITY+ PF)            
        
        let CTC = parseFloat((GS + RB + IP))
        
        let BASICpa= (BASIC*12)
        let HRApa= (HRA*12)
        let SApa= (SA*12)
        let GSpa= (GS*12)
        let GRATUITYpa= (GRATUITY*12)        
        let PFpa= (PF*12 )
        let RBpa= (RB*12)
        let CTCpa= (CTC*12)
        let IPpa= (IP*12)  

        req.salaryDetails= { BASIC, HRA, SA, GS, GRATUITY, PF, RB, CTC, IP }
        req.salaryDetailsPA= { BASICpa, HRApa, SApa, GSpa, GRATUITYpa, PFpa, RBpa, CTCpa, IPpa }
        next();

    }catch(err){
        console.error("Error in Salary Calculation middleware: ", err.message)
        logger.middlewaresLogger.error("Error in Salary Calculation middleware: "+  err.message)
        return res.status(500).json({ success : true, message : "Internal Server Error"})
    }
}
