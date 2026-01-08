import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignUpForm from "../../components/auth/SignUpForm";

export default function SignUp() {
  return (
    <>
      <PageMeta
        title="EstimatorPro | Sign Up"
        description="EsitmatorPro Sign Up"
      />
      {/* <AuthLayout> */}
        <SignUpForm />
     {/*  </AuthLayout> */}
    </>
  );
}
