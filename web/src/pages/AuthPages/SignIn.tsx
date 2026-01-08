import PageMeta from "../../components/common/PageMeta";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="EstimatorPro | Sign In"
        description="EsitmatorPro Sign In"
      />
      {/* <AuthLayout> */}
        <SignInForm />
      {/*  </AuthLayout> */}
    </>
  );
}
